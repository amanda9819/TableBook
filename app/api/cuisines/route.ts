import { createClient } from "@/lib/db/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("cuisines")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Error fetching cuisines:", error);
    return NextResponse.json(
      { error: "Failed to fetch cuisines" },
      { status: 500 }
    );
  }

  return NextResponse.json({ cuisines: data });
}
