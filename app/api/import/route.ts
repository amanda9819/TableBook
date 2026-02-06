import { getPlaceDetails } from "@/lib/google/places";
import { classifyCuisines } from "@/lib/google/cuisineMap";
import { buildYelpSearchUrl } from "@/lib/yelp/link";
import { createClient, createServiceClient } from "@/lib/db/supabaseServer";
import { NextResponse } from "next/server";

type ImportRequest = {
  google_place_id: string;
};

export async function POST(request: Request) {
  // 1) Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let body: ImportRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { google_place_id } = body;

  if (
    !google_place_id ||
    typeof google_place_id !== "string" ||
    google_place_id.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "google_place_id is required" },
      { status: 400 }
    );
  }

  try {
    // 2) Ensure default list exists (idempotent)
    const { data: existingLists, error: listSelectError } = await supabase
      .from("lists")
      .select("id")
      .eq("owner_id", user.id)
      .eq("name", "My List")
      .limit(1);

    if (listSelectError) {
      console.error("Error checking default list:", listSelectError);
      return NextResponse.json(
        { error: "Failed to check default list" },
        { status: 500 }
      );
    }

    let defaultListId: string;

    if (existingLists && existingLists.length > 0) {
      defaultListId = existingLists[0].id;
    } else {
      const { data: newList, error: listInsertError } = await supabase
        .from("lists")
        .insert({ owner_id: user.id, name: "My List" })
        .select("id")
        .single();

      if (listInsertError || !newList) {
        console.error("Error creating default list:", listInsertError);
        return NextResponse.json(
          { error: "Failed to create default list" },
          { status: 500 }
        );
      }

      defaultListId = newList.id;
    }

    // 3) Fetch Google Place Details (authoritative data)
    const placeDetails = await getPlaceDetails(google_place_id.trim());

    if (!placeDetails) {
      return NextResponse.json(
        { error: "Failed to fetch place details from Google" },
        { status: 502 }
      );
    }

    // 4) Upsert restaurant via service role (bypasses RLS)
    const serviceClient = createServiceClient();

    const { data: existingRestaurant } = await serviceClient
      .from("restaurants")
      .select("id")
      .eq("google_place_id", placeDetails.google_place_id)
      .single();

    let restaurantId: string;

    if (existingRestaurant) {
      // Update existing (do NOT overwrite created_by)
      const { error: updateError } = await serviceClient
        .from("restaurants")
        .update({
          name: placeDetails.name,
          address: placeDetails.formatted_address,
          latitude: placeDetails.latitude,
          longitude: placeDetails.longitude,
          google_rating: placeDetails.rating ?? null,
          google_review_count: placeDetails.user_ratings_total ?? null,
          ratings_updated_at: new Date().toISOString(),
        })
        .eq("id", existingRestaurant.id);

      if (updateError) {
        console.error("Error updating restaurant:", updateError);
        return NextResponse.json(
          { error: "Failed to update restaurant" },
          { status: 500 }
        );
      }

      restaurantId = existingRestaurant.id;
    } else {
      // Insert new restaurant (set created_by)
      const { data: newRestaurant, error: insertError } = await serviceClient
        .from("restaurants")
        .insert({
          google_place_id: placeDetails.google_place_id,
          name: placeDetails.name,
          address: placeDetails.formatted_address,
          latitude: placeDetails.latitude,
          longitude: placeDetails.longitude,
          google_rating: placeDetails.rating ?? null,
          google_review_count: placeDetails.user_ratings_total ?? null,
          ratings_updated_at: new Date().toISOString(),
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError || !newRestaurant) {
        console.error("Error inserting restaurant:", insertError);
        return NextResponse.json(
          { error: "Failed to create restaurant" },
          { status: 500 }
        );
      }

      restaurantId = newRestaurant.id;
    }

    // 5) Auto-classify cuisines (best-effort, skip if manual edits exist)
    try {
      const { data: manualRows } = await serviceClient
        .from("restaurant_cuisines")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("source", "manual")
        .limit(1);

      // Only auto-classify if no manual edits exist
      if (!manualRows || manualRows.length === 0) {
        const cuisineNames = classifyCuisines(
          placeDetails.types ?? [],
          placeDetails.name
        );

        if (cuisineNames.length > 0) {
          // Look up cuisine IDs by name
          const { data: cuisineRows } = await serviceClient
            .from("cuisines")
            .select("id, name")
            .in("name", cuisineNames);

          if (cuisineRows && cuisineRows.length > 0) {
            // Delete existing google-sourced cuisines for this restaurant
            await serviceClient
              .from("restaurant_cuisines")
              .delete()
              .eq("restaurant_id", restaurantId)
              .eq("source", "google");

            // Insert new google-sourced cuisines
            const rows = cuisineRows.map((c: { id: string }) => ({
              restaurant_id: restaurantId,
              cuisine_id: c.id,
              source: "google",
            }));

            await serviceClient
              .from("restaurant_cuisines")
              .upsert(rows, { onConflict: "restaurant_id,cuisine_id" });
          }
        }
      }
    } catch (cuisineError) {
      // Non-fatal: log and continue
      console.error("Auto-classification error:", cuisineError);
    }

    // 6) Add to user's default list (idempotent — handle duplicate gracefully)
    let listItemId: string | null = null;

    const { data: newListItem, error: listItemInsertError } = await supabase
      .from("list_items")
      .insert({
        list_id: defaultListId,
        restaurant_id: restaurantId,
        added_by: user.id,
        status: "wish",
      })
      .select("id")
      .single();

    if (listItemInsertError) {
      // Duplicate — already in list (unique constraint on list_id + restaurant_id)
      if (listItemInsertError.code === "23505") {
        const { data: existingItem } = await supabase
          .from("list_items")
          .select("id")
          .eq("list_id", defaultListId)
          .eq("restaurant_id", restaurantId)
          .single();

        listItemId = existingItem?.id ?? null;
      } else {
        console.error("Error adding list item:", listItemInsertError);
        return NextResponse.json(
          { error: "Failed to add restaurant to list" },
          { status: 500 }
        );
      }
    } else {
      listItemId = newListItem.id;
    }

    // 7) Build Yelp fallback link
    const yelpUrl = buildYelpSearchUrl(
      placeDetails.name,
      placeDetails.formatted_address
    );

    return NextResponse.json({
      ok: true,
      restaurantId,
      listItemId,
      restaurant: {
        name: placeDetails.name,
        address: placeDetails.formatted_address,
        google_rating: placeDetails.rating ?? null,
        google_review_count: placeDetails.user_ratings_total ?? null,
      },
      yelpUrl,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import restaurant" },
      { status: 500 }
    );
  }
}
