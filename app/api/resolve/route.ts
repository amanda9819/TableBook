import {
  extractPlaceIdFromUrl,
  extractPlaceNameFromUrl,
  getPlaceDetails,
  textSearch,
  type PlaceCandidate,
} from "@/lib/google/places";
import { createClient } from "@/lib/db/supabaseServer";
import { NextResponse } from "next/server";

type ResolveRequest = {
  query: string;
};

type ResolveResponse = {
  candidates: PlaceCandidate[];
  source: "url" | "text_search";
};

/**
 * Detect if input is a Google Maps URL
 */
function isGoogleMapsUrl(input: string): boolean {
  return (
    input.includes("google.com/maps") ||
    input.includes("goo.gl/maps") ||
    input.includes("maps.app.goo.gl") ||
    input.includes("maps.google.com")
  );
}

export async function POST(request: Request) {
  // Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let body: ResolveRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query } = body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  const trimmedQuery = query.trim();

  try {
    let candidates: PlaceCandidate[] = [];
    let source: "url" | "text_search" = "text_search";

    if (isGoogleMapsUrl(trimmedQuery)) {
      source = "url";

      // Try to extract Place ID from URL
      const placeId = await extractPlaceIdFromUrl(trimmedQuery);

      if (placeId) {
        // Get place details directly
        const place = await getPlaceDetails(placeId);
        if (place) {
          candidates = [place];
        }
      }

      // Fallback: extract name from URL and do text search
      if (candidates.length === 0) {
        const placeName = extractPlaceNameFromUrl(trimmedQuery);
        if (placeName) {
          candidates = await textSearch(placeName);
          source = "text_search";
        }
      }

      // If still no results, return error
      if (candidates.length === 0) {
        return NextResponse.json(
          { error: "Could not resolve Google Maps URL" },
          { status: 400 }
        );
      }
    } else {
      // Free text search
      candidates = await textSearch(trimmedQuery);
    }

    const response: ResolveResponse = {
      candidates,
      source,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Resolve error:", error);
    return NextResponse.json(
      { error: "Failed to resolve query" },
      { status: 500 }
    );
  }
}
