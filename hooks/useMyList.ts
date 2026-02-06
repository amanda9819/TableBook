"use client";

import { createClient } from "@/lib/db/supabaseClient";
import type { ListItem } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useMyList(listId: string | null) {
  return useQuery<ListItem[]>({
    queryKey: ["myList", listId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("list_items")
        .select(
          "id, list_id, restaurant_id, added_by, status, note, created_at, restaurant:restaurants(id, created_by, name, address, google_place_id, google_rating, google_review_count, created_at)"
        )
        .eq("list_id", listId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ListItem[];
    },
    enabled: !!listId,
  });
}

export function useToggleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listItemId,
      currentStatus,
    }: {
      listItemId: string;
      currentStatus: "wish" | "visited";
    }) => {
      const newStatus = currentStatus === "wish" ? "visited" : "wish";
      const supabase = createClient();
      const { error } = await supabase
        .from("list_items")
        .update({ status: newStatus })
        .eq("id", listItemId);

      if (error) throw error;
      return newStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myList"] });
    },
  });
}
