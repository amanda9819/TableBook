"use client";

import { createClient } from "@/lib/db/supabaseClient";
import type { Restaurant, UploaderMap } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export function useRestaurants() {
  return useQuery<Restaurant[]>({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, created_by, name, address, google_place_id, google_rating, google_review_count, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploaders() {
  return useQuery<UploaderMap>({
    queryKey: ["uploaders"],
    queryFn: async () => {
      const res = await fetch("/api/uploaders");
      if (!res.ok) throw new Error("Failed to fetch uploaders");
      const data = await res.json();
      return data.uploaders;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
