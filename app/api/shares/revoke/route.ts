import { createClient, createServiceClient } from "@/lib/db/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { shareId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { shareId } = body;
  if (!shareId) {
    return NextResponse.json(
      { error: "shareId is required" },
      { status: 400 }
    );
  }

  // Verify ownership: look up the share and its list
  const { data: share } = await supabase
    .from("shares")
    .select("id, list_id")
    .eq("id", shareId)
    .single();

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  // Use service client to update expires_at (no UPDATE RLS policy exists)
  const serviceClient = createServiceClient();

  const { error: updateError } = await serviceClient
    .from("shares")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", share.id);

  if (updateError) {
    console.error("Error revoking share:", updateError);
    return NextResponse.json(
      { error: "Failed to revoke share link" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
