"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Share = {
  id: string;
  token: string;
  created_at?: string;
  expires_at?: string | null;
};

export function useShare() {
  return useQuery<Share | null>({
    queryKey: ["share"],
    queryFn: async () => {
      const res = await fetch("/api/shares");
      if (!res.ok) throw new Error("Failed to fetch share");
      const data = await res.json();
      return data.share ?? null;
    },
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shares", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create share link");
      }

      const data = await res.json();
      return data.share as Share;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share"] });
    },
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shareId: string) => {
      const res = await fetch("/api/shares/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke share link");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share"] });
    },
  });
}
