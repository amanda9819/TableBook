import { createClient, createServiceClient } from "@/lib/db/supabaseServer";
import { NextResponse } from "next/server";

type PutBody = {
  restaurantId: string;
  cuisineIds: string[];
};

export async function PUT(request: Request) {
  // 1) Authenticate caller
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Parse body
  let body: PutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { restaurantId, cuisineIds } = body;

  if (!restaurantId || !Array.isArray(cuisineIds)) {
    return NextResponse.json(
      { error: "restaurantId and cuisineIds[] are required" },
      { status: 400 }
    );
  }

  // 3) Verify ownership
  const serviceClient = createServiceClient();

  const { data: restaurant, error: fetchError } = await serviceClient
    .from("restaurants")
    .select("created_by")
    .eq("id", restaurantId)
    .single();

  if (fetchError || !restaurant) {
    return NextResponse.json(
      { error: "Restaurant not found" },
      { status: 404 }
    );
  }

  if (restaurant.created_by !== user.id) {
    return NextResponse.json(
      { error: "Only the restaurant uploader can edit cuisines" },
      { status: 403 }
    );
  }

  // 4) Delete existing restaurant_cuisines for this restaurant
  const { error: deleteError } = await serviceClient
    .from("restaurant_cuisines")
    .delete()
    .eq("restaurant_id", restaurantId);

  if (deleteError) {
    console.error("Error deleting restaurant cuisines:", deleteError);
    return NextResponse.json(
      { error: "Failed to update cuisines" },
      { status: 500 }
    );
  }

  // 5) Insert new rows with source: 'manual'
  if (cuisineIds.length > 0) {
    const rows = cuisineIds.map((cuisineId) => ({
      restaurant_id: restaurantId,
      cuisine_id: cuisineId,
      source: "manual",
    }));

    const { error: insertError } = await serviceClient
      .from("restaurant_cuisines")
      .insert(rows);

    if (insertError) {
      console.error("Error inserting restaurant cuisines:", insertError);
      return NextResponse.json(
        { error: "Failed to save cuisines" },
        { status: 500 }
      );
    }
  }

  // 6) Return updated cuisine list
  const { data: updated, error: selectError } = await serviceClient
    .from("restaurant_cuisines")
    .select("id, restaurant_id, cuisine_id, source, cuisine:cuisines(id, name)")
    .eq("restaurant_id", restaurantId);

  if (selectError) {
    console.error("Error fetching updated cuisines:", selectError);
    return NextResponse.json(
      { error: "Cuisines saved but failed to fetch updated list" },
      { status: 500 }
    );
  }

  return NextResponse.json({ restaurantCuisines: updated });
}
