import { createClient } from "@/lib/db/supabaseServer";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has a list
  const { data: existingLists, error: selectError } = await supabase
    .from("lists")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  if (selectError) {
    console.error("Error checking lists:", selectError);
    return NextResponse.json(
      { error: "Failed to check lists" },
      { status: 500 }
    );
  }

  // If list exists, return it
  if (existingLists && existingLists.length > 0) {
    return NextResponse.json({
      ok: true,
      listId: existingLists[0].id,
      created: false,
    });
  }

  // Create default list
  const { data: newList, error: insertError } = await supabase
    .from("lists")
    .insert({
      owner_id: user.id,
      name: "My List",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error creating list:", insertError);
    return NextResponse.json(
      { error: "Failed to create list" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    listId: newList.id,
    created: true,
  });
}
