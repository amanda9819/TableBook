"use client";

import { createClient } from "@/lib/db/supabaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type RatingRow = {
  restaurant_id: string;
  rating: number;
};

export function useMyRatings(userId: string | null) {
  return useQuery<Record<string, number>>({
    queryKey: ["myRatings", userId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_restaurant_ratings")
        .select("restaurant_id, rating")
        .eq("user_id", userId!);

      if (error) throw error;

      const map: Record<string, number> = {};
      for (const row of (data ?? []) as RatingRow[]) {
        map[row.restaurant_id] = row.rating;
      }
      return map;
    },
    enabled: !!userId,
  });
}

export function useSetRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      rating,
    }: {
      restaurantId: string;
      rating: number | null;
    }) => {
      if (rating === null) {
        const res = await fetch("/api/ratings", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to delete rating");
        }

        return res.json();
      }

      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, rating }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save rating");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRatings"] });
    },
  });
}
