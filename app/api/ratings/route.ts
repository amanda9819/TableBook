import { createClient } from "@/lib/db/supabaseServer";
import { NextResponse } from "next/server";

type RatingRequest = {
  restaurantId: string;
  rating: number;
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

  // 2) Parse body
  let body: RatingRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { restaurantId, rating } = body;

  if (!restaurantId || typeof restaurantId !== "string") {
    return NextResponse.json(
      { error: "restaurantId is required" },
      { status: 400 }
    );
  }

  // 3) Validate rating (integer 1–5)
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json(
      { error: "rating must be an integer between 1 and 5" },
      { status: 400 }
    );
  }

  // 4) Verify restaurant is in user's list
  const { data: listItem, error: listError } = await supabase
    .from("list_items")
    .select("id, list:lists!inner(owner_id)")
    .eq("restaurant_id", restaurantId)
    .eq("lists.owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (listError) {
    console.error("Error checking list membership:", listError);
    return NextResponse.json(
      { error: "Failed to verify list membership" },
      { status: 500 }
    );
  }

  if (!listItem) {
    return NextResponse.json(
      { error: "Restaurant is not in your list" },
      { status: 403 }
    );
  }

  // 5) Upsert rating (RLS enforces user_id = auth.uid() for INSERT/UPDATE)
  const { data: upserted, error: upsertError } = await supabase
    .from("user_restaurant_ratings")
    .upsert(
      {
        user_id: user.id,
        restaurant_id: restaurantId,
        rating,
      },
      { onConflict: "user_id,restaurant_id" }
    )
    .select("id, restaurant_id, rating")
    .single();

  if (upsertError) {
    console.error("Error upserting rating:", upsertError);
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }

  return NextResponse.json({ rating: upserted });
}
