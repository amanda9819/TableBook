"use client";

import { createClient } from "@/lib/db/supabaseClient";
import type { Cuisine, RestaurantCuisine } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useCuisines() {
  return useQuery<Cuisine[]>({
    queryKey: ["cuisines"],
    queryFn: async () => {
      const res = await fetch("/api/cuisines");
      if (!res.ok) throw new Error("Failed to fetch cuisines");
      const data = await res.json();
      return data.cuisines;
    },
    staleTime: Infinity,
  });
}

export function useRestaurantCuisines() {
  return useQuery<Record<string, Cuisine[]>>({
    queryKey: ["restaurant-cuisines"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("restaurant_cuisines")
        .select(
          "id, restaurant_id, cuisine_id, source, cuisine:cuisines(id, name)"
        );

      if (error) throw error;

      const map: Record<string, Cuisine[]> = {};
      for (const row of (data ?? []) as unknown as RestaurantCuisine[]) {
        if (!map[row.restaurant_id]) {
          map[row.restaurant_id] = [];
        }
        map[row.restaurant_id].push(row.cuisine);
      }
      return map;
    },
  });
}

export function useUpdateCuisines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      cuisineIds,
    }: {
      restaurantId: string;
      cuisineIds: string[];
    }) => {
      const res = await fetch("/api/restaurant-cuisines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, cuisineIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update cuisines");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-cuisines"] });
    },
  });
}
