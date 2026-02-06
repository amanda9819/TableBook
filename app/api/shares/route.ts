import { createClient } from "@/lib/db/supabaseServer";
import { randomBytes } from "crypto";
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

  // Get user's default list
  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("owner_id", user.id)
    .eq("name", "My List")
    .single();

  if (!list) {
    return NextResponse.json({ share: null });
  }

  // Get active share (expires_at is null or in the future)
  const { data: share } = await supabase
    .from("shares")
    .select("id, token, created_at, expires_at")
    .eq("list_id", list.id)
    .is("expires_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ share });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's default list
  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("owner_id", user.id)
    .eq("name", "My List")
    .single();

  if (!list) {
    return NextResponse.json({ error: "No list found" }, { status: 404 });
  }

  // Check for existing active share
  const { data: existing } = await supabase
    .from("shares")
    .select("id, token")
    .eq("list_id", list.id)
    .is("expires_at", null)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ share: existing });
  }

  // Generate unguessable token
  const token = randomBytes(24).toString("base64url");

  // Insert new share (RLS enforces created_by = auth.uid() and list ownership)
  const { data: share, error: insertError } = await supabase
    .from("shares")
    .insert({
      list_id: list.id,
      token,
      created_by: user.id,
    })
    .select("id, token")
    .single();

  if (insertError) {
    console.error("Error creating share:", insertError);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }

  return NextResponse.json({ share });
}
