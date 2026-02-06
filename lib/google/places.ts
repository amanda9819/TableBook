const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.warn("GOOGLE_PLACES_API_KEY is not set");
}

export type PlaceCandidate = {
  google_place_id: string;
  name: string;
  formatted_address: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
};

// Places API (New) response types
type PlaceNew = {
  id: string;
  displayName?: {
    text: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  types?: string[];
};

type TextSearchNewResponse = {
  places?: PlaceNew[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
};

const TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.types",
].join(",");

const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "types",
].join(",");

/**
 * Search for places using Places API (New) - searchText endpoint
 */
export async function textSearch(query: string): Promise<PlaceCandidate[]> {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        includedType: "restaurant",
      }),
    }
  );

  const data: TextSearchNewResponse = await response.json();

  if (data.error) {
    console.error(
      "Google Places Text Search error:",
      data.error.code,
      data.error.message
    );
    throw new Error(`Google Places API error: ${data.error.message}`);
  }

  if (!data.places) {
    return [];
  }

  return data.places.map((place) => ({
    google_place_id: place.id,
    name: place.displayName?.text ?? "",
    formatted_address: place.formattedAddress ?? "",
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    rating: place.rating,
    user_ratings_total: place.userRatingCount,
    types: place.types,
  }));
}

/**
 * Get place details by Place ID using Places API (New)
 */
export async function getPlaceDetails(
  placeId: string
): Promise<PlaceCandidate | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Google Places Details error:", errorData);
    return null;
  }

  const place: PlaceNew = await response.json();

  return {
    google_place_id: place.id,
    name: place.displayName?.text ?? "",
    formatted_address: place.formattedAddress ?? "",
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    rating: place.rating,
    user_ratings_total: place.userRatingCount,
    types: place.types,
  };
}

/**
 * Extract Place ID from a Google Maps URL
 * Supports various URL formats
 */
export async function extractPlaceIdFromUrl(
  url: string
): Promise<string | null> {
  // Handle short URLs by following redirects
  if (url.includes("goo.gl") || url.includes("maps.app.goo.gl")) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
      });
      url = response.url;
    } catch (error) {
      console.error("Error following redirect:", error);
      return null;
    }
  }

  // Try to extract place_id from URL parameters
  // Format: ...?...&place_id=ChIJ...
  const urlObj = new URL(url);
  const placeIdParam = urlObj.searchParams.get("place_id");
  if (placeIdParam) {
    return placeIdParam;
  }

  // Try to extract from /place/ path with data parameter
  // Format: /maps/place/Name/@lat,lng,zoom/data=...!1s<place_id>...
  const dataMatch = url.match(/!1s(ChIJ[^!]+)/);
  if (dataMatch) {
    return decodeURIComponent(dataMatch[1]);
  }

  // Try to extract from ftid parameter
  // Format: ...ftid=0x...:0x...
  const ftidMatch = url.match(/ftid=([^&]+)/);
  if (ftidMatch) {
    // ftid needs to be converted to place_id via API
    // For now, return null and let text search handle it
    return null;
  }

  // Try CID format (numeric ID)
  const cidMatch = url.match(/cid=(\d+)/);
  if (cidMatch) {
    // CID needs special handling, skip for now
    return null;
  }

  return null;
}

/**
 * Extract place name from Google Maps URL for fallback search
 */
export function extractPlaceNameFromUrl(url: string): string | null {
  try {
    // Format: /maps/place/Restaurant+Name/...
    const placeMatch = url.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }
  } catch {
    return null;
  }
  return null;
}
