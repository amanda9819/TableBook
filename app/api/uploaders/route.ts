import { createClient, createServiceClient } from "@/lib/db/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  // Authenticate caller
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get distinct created_by from restaurants using service role
    const serviceClient = createServiceClient();

    const { data: restaurants, error: queryError } = await serviceClient
      .from("restaurants")
      .select("created_by");

    if (queryError) {
      console.error("Error fetching uploaders:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch uploaders" },
        { status: 500 }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(restaurants.map((r: { created_by: string }) => r.created_by))];

    // Resolve each user ID to email
    const uploaders: Record<string, string> = {};

    for (const uid of userIds) {
      try {
        const { data, error } = await serviceClient.auth.admin.getUserById(uid as string);
        if (error || !data?.user?.email) {
          uploaders[uid as string] = (uid as string).substring(0, 8) + "...";
        } else {
          uploaders[uid as string] = data.user.email;
        }
      } catch {
        uploaders[uid as string] = (uid as string).substring(0, 8) + "...";
      }
    }

    return NextResponse.json({ uploaders });
  } catch (error) {
    console.error("Uploaders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch uploaders" },
      { status: 500 }
    );
  }
}
