import { createClient } from "@/lib/db/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

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
    .from("user_profiles")
    .select("id, display_name, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile: data });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const rawName = body.displayName;

  // Normalize: empty/whitespace → null
  const displayName =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim()
      : null;

  // Validate max length
  if (displayName && displayName.length > 50) {
    return NextResponse.json(
      { error: "Display name must be 50 characters or less" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      { id: user.id, display_name: displayName },
      { onConflict: "id" }
    )
    .select("id, display_name, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile: data });
}
