import { createServiceClient } from "@/lib/db/supabaseServer";
import { buildYelpSearchUrl } from "@/lib/yelp/link";
import { Star, ExternalLink } from "lucide-react";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function SharedListPage({ params }: Props) {
  const { token } = await params;
  const serviceClient = createServiceClient();

  // 1) Look up share by token
  const { data: share } = await serviceClient
    .from("shares")
    .select("id, list_id, expires_at")
    .eq("token", token)
    .single();

  if (!share) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">
          This link is no longer available.
        </p>
      </main>
    );
  }

  // Check if revoked (expires_at is set and in the past)
  if (share.expires_at && new Date(share.expires_at) <= new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">
          This link is no longer available.
        </p>
      </main>
    );
  }

  // 2) Load list info
  const { data: list } = await serviceClient
    .from("lists")
    .select("id, name, owner_id")
    .eq("id", share.list_id)
    .single();

  if (!list) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">
          This link is no longer available.
        </p>
      </main>
    );
  }

  // 3) Resolve owner name for display (prefer display_name, fall back to email)
  let ownerName = "Shared List";
  const { data: ownerProfile } = await serviceClient
    .from("user_profiles")
    .select("display_name")
    .eq("id", list.owner_id)
    .maybeSingle();

  if (ownerProfile?.display_name) {
    ownerName = `${ownerProfile.display_name}'s List`;
  } else {
    try {
      const { data: ownerData } =
        await serviceClient.auth.admin.getUserById(list.owner_id);
      if (ownerData?.user?.email) {
        const emailName = ownerData.user.email.split("@")[0];
        ownerName = `${emailName}'s List`;
      }
    } catch {
      // Fall back to generic name
    }
  }

  // 4) Load list items + restaurants
  const { data: items } = await serviceClient
    .from("list_items")
    .select(
      "id, status, restaurant:restaurants(id, name, address, google_place_id, google_rating, google_review_count)"
    )
    .eq("list_id", list.id)
    .order("created_at", { ascending: false });

  // 5) Load cuisines for these restaurants
  const restaurantIds = (items ?? [])
    .map((item: Record<string, unknown>) => {
      const r = item.restaurant as Record<string, unknown> | null;
      return r?.id as string | undefined;
    })
    .filter(Boolean) as string[];

  let cuisineMap: Record<string, { name: string }[]> = {};
  if (restaurantIds.length > 0) {
    const { data: cuisineRows } = await serviceClient
      .from("restaurant_cuisines")
      .select("restaurant_id, cuisine:cuisines(name)")
      .in("restaurant_id", restaurantIds);

    if (cuisineRows) {
      for (const row of cuisineRows as { restaurant_id: string; cuisine: { name: string } }[]) {
        if (!cuisineMap[row.restaurant_id]) {
          cuisineMap[row.restaurant_id] = [];
        }
        cuisineMap[row.restaurant_id].push(row.cuisine);
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-3 p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{ownerName}</h1>
        <span className="text-xs text-muted-foreground">
          {(items ?? []).length} restaurants
        </span>
      </div>

      {(!items || items.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-8">
          This list is empty.
        </p>
      )}

      <div className="space-y-2">
        {(items ?? []).map((item: Record<string, unknown>) => {
          const r = item.restaurant as {
            id: string;
            name: string;
            address: string;
            google_place_id: string;
            google_rating: number | null;
            google_review_count: number | null;
          } | null;
          if (!r) return null;

          const yelpUrl = buildYelpSearchUrl(r.name, r.address);
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + " " + r.address)}&query_place_id=${encodeURIComponent(r.google_place_id)}`;
          const cuisines = cuisineMap[r.id] ?? [];

          return (
            <div
              key={item.id as string}
              className="rounded-lg border border-border bg-card p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm leading-tight">
                    {r.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {r.address}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {r.google_rating != null && (
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {r.google_rating}
                    {r.google_review_count != null && (
                      <span className="ml-0.5">({r.google_review_count})</span>
                    )}
                  </span>
                )}

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-600 hover:underline ml-auto"
                >
                  Maps
                  <ExternalLink className="h-3 w-3" />
                </a>

                <a
                  href={yelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                >
                  Yelp
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {cuisines.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {cuisines.slice(0, 2).map((c, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground pt-4">
        Shared via{" "}
        <span className="font-medium">Table Book</span>
      </p>
    </main>
  );
}
