"use client";

import { Button } from "@/components/ui/button";
import { RestaurantCard } from "@/components/restaurant-card";
import { TabBar } from "@/components/tab-bar";
import { useAuth } from "@/hooks/useAuth";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useMyList, useToggleStatus, useRemoveFromList } from "@/hooks/useMyList";
import { useRestaurants, useUploaders } from "@/hooks/useRestaurants";
import {
  useCuisines,
  useRestaurantCuisines,
  useUpdateCuisines,
} from "@/hooks/useCuisines";
import { useMyRatings, useSetRating } from "@/hooks/useRatings";
import { useShare, useCreateShare, useRevokeShare } from "@/hooks/useShare";
import { signOut } from "@/lib/auth/client";
import { buildYelpSearchUrl } from "@/lib/yelp/link";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, X, Link2, Copy, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type PlaceCandidate = {
  google_place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
};

type ImportState = {
  status: "idle" | "loading" | "done" | "error";
  error?: string;
  yelpUrl?: string;
};

const TABS = [
  { key: "all", label: "All Restaurants" },
  { key: "mylist", label: "My List" },
];

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoading: authLoading, isAuthenticated, userId, email } = useAuth();
  const { result: bootstrapResult } = useBootstrap(isAuthenticated);
  const listId = bootstrapResult?.listId ?? null;

  // Data queries
  const { data: restaurants = [], isLoading: restaurantsLoading } =
    useRestaurants();
  const { data: uploaders = {} } = useUploaders();
  const { data: myListItems = [], isLoading: myListLoading } =
    useMyList(listId);
  const toggleStatus = useToggleStatus();
  const removeFromList = useRemoveFromList();
  const { data: myRatings = {} } = useMyRatings(userId);
  const setRating = useSetRating();

  // Share queries
  const { data: activeShare } = useShare();
  const createShare = useCreateShare();
  const revokeShare = useRevokeShare();
  const [copied, setCopied] = useState(false);

  // Cuisine queries
  const { data: allCuisines = [] } = useCuisines();
  const { data: restaurantCuisinesMap = {} } = useRestaurantCuisines();
  const updateCuisines = useUpdateCuisines();

  // UI state
  const [activeTab, setActiveTab] = useState("all");
  const [uploaderFilter, setUploaderFilter] = useState<string>("all");
  const [cuisineFilter, setCuisineFilter] = useState<string>("all");
  const [myListCuisineFilter, setMyListCuisineFilter] = useState<string>("all");

  // Cuisine edit modal state
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(
    null
  );
  const [editingCuisineIds, setEditingCuisineIds] = useState<string[]>([]);

  // Search / resolve state
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [resolveStatus, setResolveStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [importStates, setImportStates] = useState<
    Record<string, ImportState>
  >({});

  // Derived data
  const myListRestaurantIds = useMemo(
    () => new Set(myListItems.map((item) => item.restaurant_id)),
    [myListItems]
  );

  const uniqueUploaderIds = useMemo(
    () => [...new Set(restaurants.map((r) => r.created_by))],
    [restaurants]
  );

  const filteredMyListItems = useMemo(() => {
    if (myListCuisineFilter === "all") return myListItems;
    return myListItems.filter((item) => {
      const cuisines = restaurantCuisinesMap[item.restaurant_id];
      return cuisines?.some((c) => c.id === myListCuisineFilter);
    });
  }, [myListItems, myListCuisineFilter, restaurantCuisinesMap]);

  const filteredRestaurants = useMemo(() => {
    let filtered = restaurants;
    if (uploaderFilter !== "all") {
      filtered = filtered.filter((r) => r.created_by === uploaderFilter);
    }
    if (cuisineFilter !== "all") {
      filtered = filtered.filter((r) => {
        const cuisines = restaurantCuisinesMap[r.id];
        return cuisines?.some((c) => c.id === cuisineFilter);
      });
    }
    return filtered;
  }, [restaurants, uploaderFilter, cuisineFilter, restaurantCuisinesMap]);

  // Handlers
  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const handleResolve = async () => {
    if (!query.trim()) return;

    setResolveStatus("loading");
    setResolveError(null);
    setCandidates([]);
    setImportStates({});

    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResolveError(data.error || "Failed to resolve");
        setResolveStatus("error");
        return;
      }

      setCandidates(data.candidates || []);
      setResolveStatus("done");
    } catch (err) {
      console.error("Resolve error:", err);
      setResolveError("Network error");
      setResolveStatus("error");
    }
  };

  const handleImport = async (candidate: PlaceCandidate) => {
    const id = candidate.google_place_id;

    setImportStates((prev) => ({
      ...prev,
      [id]: { status: "loading" },
    }));

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_place_id: id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportStates((prev) => ({
          ...prev,
          [id]: { status: "error", error: data.error || "Import failed" },
        }));
        return;
      }

      setImportStates((prev) => ({
        ...prev,
        [id]: { status: "done", yelpUrl: data.yelpUrl },
      }));

      // Invalidate queries so lists refresh
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["myList"] });
      queryClient.invalidateQueries({ queryKey: ["uploaders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-cuisines"] });
    } catch (err) {
      console.error("Import error:", err);
      setImportStates((prev) => ({
        ...prev,
        [id]: { status: "error", error: "Network error" },
      }));
    }
  };

  const handleAddToMyList = async (restaurantId: string, googlePlaceId: string) => {
    setImportStates((prev) => ({
      ...prev,
      [restaurantId]: { status: "loading" },
    }));

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_place_id: googlePlaceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportStates((prev) => ({
          ...prev,
          [restaurantId]: { status: "error", error: data.error || "Failed" },
        }));
        return;
      }

      setImportStates((prev) => ({
        ...prev,
        [restaurantId]: { status: "done" },
      }));

      queryClient.invalidateQueries({ queryKey: ["myList"] });
    } catch {
      setImportStates((prev) => ({
        ...prev,
        [restaurantId]: { status: "error", error: "Network error" },
      }));
    }
  };

  // Cuisine edit handlers
  const handleOpenCuisineEdit = (restaurantId: string) => {
    const currentCuisines = restaurantCuisinesMap[restaurantId] ?? [];
    setEditingCuisineIds(currentCuisines.map((c) => c.id));
    setEditingRestaurantId(restaurantId);
  };

  const handleToggleCuisineId = (cuisineId: string) => {
    setEditingCuisineIds((prev) =>
      prev.includes(cuisineId)
        ? prev.filter((id) => id !== cuisineId)
        : [...prev, cuisineId]
    );
  };

  const handleSaveCuisines = async () => {
    if (!editingRestaurantId) return;
    await updateCuisines.mutateAsync({
      restaurantId: editingRestaurantId,
      cuisineIds: editingCuisineIds,
    });
    setEditingRestaurantId(null);
  };

  // Loading state
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-3 p-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Table Book</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground truncate max-w-[140px]">
            {email}
          </span>
          <Button onClick={handleSignOut} variant="ghost" size="sm">
            Sign out
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* All Restaurants tab */}
      {activeTab === "all" && (
        <div className="flex flex-col gap-3">
          {/* Search bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Restaurant name or Google Maps URL"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleResolve()}
            />
            <Button
              onClick={handleResolve}
              disabled={resolveStatus === "loading"}
              size="sm"
            >
              {resolveStatus === "loading" ? "..." : "Search"}
            </Button>
          </div>

          {resolveError && (
            <p className="text-sm text-destructive">{resolveError}</p>
          )}

          {/* Search results */}
          {candidates.length > 0 && (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Search results ({candidates.length})
                </p>
                <button
                  onClick={() => {
                    setCandidates([]);
                    setImportStates({});
                    setResolveStatus("idle");
                    setQuery("");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {candidates.map((c) => {
                const importState = importStates[c.google_place_id];
                const isImported = importState?.status === "done";
                const isImporting = importState?.status === "loading";

                return (
                  <div
                    key={c.google_place_id}
                    className="rounded-md border border-border bg-card p-2.5 space-y-1.5"
                  >
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.formatted_address}
                    </p>
                    {c.rating && (
                      <p className="text-xs text-muted-foreground">
                        Rating: {c.rating} ({c.user_ratings_total} reviews)
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {!isImported && (
                        <Button
                          size="sm"
                          onClick={() => handleImport(c)}
                          disabled={isImporting}
                          className="text-xs"
                        >
                          {isImporting ? "Adding..." : "Add"}
                        </Button>
                      )}

                      {isImported && (
                        <span className="text-xs font-medium text-green-600">
                          Added to your list
                        </span>
                      )}

                      {importState?.status === "error" && (
                        <span className="text-xs text-destructive">
                          {importState.error}
                        </span>
                      )}

                      {isImported && importState.yelpUrl ? (
                        <a
                          href={importState.yelpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline"
                        >
                          Yelp <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        !isImported && (
                          <a
                            href={buildYelpSearchUrl(
                              c.name,
                              c.formatted_address
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-xs text-blue-500 hover:underline"
                          >
                            Yelp <ExternalLink className="h-3 w-3" />
                          </a>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {resolveStatus === "done" && candidates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No results found
            </p>
          )}

          {/* Filters */}
          <div className="flex gap-2">
            {uniqueUploaderIds.length > 1 && (
              <select
                value={uploaderFilter}
                onChange={(e) => setUploaderFilter(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="all">All uploaders</option>
                {uniqueUploaderIds.map((uid) => (
                  <option key={uid} value={uid}>
                    {uploaders[uid] ?? uid.substring(0, 8) + "..."}
                  </option>
                ))}
              </select>
            )}
            {allCuisines.length > 0 && (
              <select
                value={cuisineFilter}
                onChange={(e) => setCuisineFilter(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="all">All cuisines</option>
                {allCuisines.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Restaurant list */}
          {restaurantsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading restaurants...
            </p>
          ) : filteredRestaurants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No restaurants yet. Use the search bar above to add some!
            </p>
          ) : (
            <div className="space-y-2">
              {filteredRestaurants.map((r) => {
                const inList = myListRestaurantIds.has(r.id);
                const addState = importStates[r.id];
                const isOwner = r.created_by === userId;
                return (
                  <RestaurantCard
                    key={r.id}
                    name={r.name}
                    address={r.address}
                    googlePlaceId={r.google_place_id}
                    googleRating={r.google_rating}
                    googleReviewCount={r.google_review_count}
                    uploaderName={uploaders[r.created_by] ?? r.created_by.substring(0, 8) + "..."}
                    cuisines={restaurantCuisinesMap[r.id]}
                    isOwner={isOwner}
                    onEditCuisines={
                      isOwner
                        ? () => handleOpenCuisineEdit(r.id)
                        : undefined
                    }
                    onAdd={() => handleAddToMyList(r.id, r.google_place_id)}
                    isInMyList={inList || addState?.status === "done"}
                    isAdding={addState?.status === "loading"}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My List tab */}
      {activeTab === "mylist" && (
        <div className="flex flex-col gap-2">
          {/* Share link section */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            {activeShare ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/s/${activeShare.token}`
                      : `/s/${activeShare.token}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => {
                      const url = `${window.location.origin}/s/${activeShare.token}`;
                      navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    {copied ? "Copied!" : "Copy link"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => revokeShare.mutate(activeShare.id)}
                    disabled={revokeShare.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                    {revokeShare.isPending ? "..." : "Revoke"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => createShare.mutate()}
                disabled={createShare.isPending}
              >
                <Link2 className="h-3 w-3" />
                {createShare.isPending ? "Creating..." : "Share my list"}
              </Button>
            )}
          </div>

          {/* Cuisine filter for My List */}
          {allCuisines.length > 0 && myListItems.length > 0 && (
            <select
              value={myListCuisineFilter}
              onChange={(e) => setMyListCuisineFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">All cuisines</option>
              {allCuisines.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {myListLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading your list...
            </p>
          ) : myListItems.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                Your list is empty.
              </p>
              <p className="text-xs text-muted-foreground">
                Switch to{" "}
                <button
                  onClick={() => setActiveTab("all")}
                  className="text-primary underline"
                >
                  All Restaurants
                </button>{" "}
                to add some!
              </p>
            </div>
          ) : filteredMyListItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No restaurants match this cuisine.
            </p>
          ) : (
            filteredMyListItems.map((item) => {
              const isOwner = item.restaurant.created_by === userId;
              return (
                <RestaurantCard
                  key={item.id}
                  name={item.restaurant.name}
                  address={item.restaurant.address}
                  googlePlaceId={item.restaurant.google_place_id}
                  googleRating={item.restaurant.google_rating}
                  googleReviewCount={item.restaurant.google_review_count}
                  cuisines={restaurantCuisinesMap[item.restaurant_id]}
                  isOwner={isOwner}
                  onEditCuisines={
                    isOwner
                      ? () => handleOpenCuisineEdit(item.restaurant_id)
                      : undefined
                  }
                  status={item.status}
                  onToggleStatus={() =>
                    toggleStatus.mutate({
                      listItemId: item.id,
                      currentStatus: item.status,
                    })
                  }
                  userRating={myRatings[item.restaurant_id]}
                  onRate={(rating) =>
                    setRating.mutate({
                      restaurantId: item.restaurant_id,
                      rating,
                    })
                  }
                  onRemove={() => removeFromList.mutate(item.id)}
                  isRemoving={
                    removeFromList.isPending &&
                    removeFromList.variables === item.id
                  }
                />
              );
            })
          )}
        </div>
      )}
      {/* Cuisine edit modal */}
      {editingRestaurantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-background border border-border p-4 space-y-3 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Edit Cuisines</h2>
              <button
                onClick={() => setEditingRestaurantId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-1">
              {allCuisines.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No cuisines available. Run the seed-cuisines.sql script in the Supabase SQL Editor.
                </p>
              )}
              {allCuisines.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={editingCuisineIds.includes(c.id)}
                    onChange={() => handleToggleCuisineId(c.id)}
                    className="rounded"
                  />
                  {c.name}
                </label>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setEditingRestaurantId(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSaveCuisines}
                disabled={updateCuisines.isPending}
              >
                {updateCuisines.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
