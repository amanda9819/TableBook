"use client";

import { buildYelpSearchUrl } from "@/lib/yelp/link";
import { cn } from "@/lib/utils";
import type { Cuisine } from "@/lib/types";
import { Star, ExternalLink, Plus, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

type RestaurantCardProps = {
  name: string;
  address: string;
  googlePlaceId: string;
  googleRating: number | null;
  googleReviewCount: number | null;
  uploaderName?: string;
  cuisines?: Cuisine[];
  isOwner?: boolean;
  onEditCuisines?: () => void;
  // All Restaurants mode
  onAdd?: () => void;
  isInMyList?: boolean;
  isAdding?: boolean;
  // My List mode
  status?: "wish" | "visited";
  onToggleStatus?: () => void;
  // Rating (My List only)
  userRating?: number;
  onRate?: (rating: number | null) => void;
};

export function RestaurantCard({
  name,
  address,
  googlePlaceId,
  googleRating,
  googleReviewCount,
  uploaderName,
  cuisines,
  isOwner,
  onEditCuisines,
  onAdd,
  isInMyList,
  isAdding,
  status,
  onToggleStatus,
  userRating,
  onRate,
}: RestaurantCardProps) {
  const yelpUrl = buildYelpSearchUrl(name, address);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + address)}&query_place_id=${encodeURIComponent(googlePlaceId)}`;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm leading-tight">{name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {address}
          </p>
        </div>

        {/* Status badge (My List mode) */}
        {status && onToggleStatus && (
          <button
            onClick={onToggleStatus}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              status === "visited"
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
            )}
          >
            {status === "visited" ? "Visited" : "Wish"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {googleRating != null && (
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {googleRating}
            {googleReviewCount != null && (
              <span className="ml-0.5">({googleReviewCount})</span>
            )}
          </span>
        )}

        {uploaderName && <span>by {uploaderName}</span>}

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

      {/* Cuisine badges */}
      {cuisines && cuisines.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {cuisines.slice(0, 2).map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {c.name}
            </span>
          ))}
          {isOwner && onEditCuisines && (
            <button
              onClick={onEditCuisines}
              className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-2.5 w-2.5" />
              Edit
            </button>
          )}
        </div>
      )}

      {/* Show edit button even when no cuisines, if owner */}
      {(!cuisines || cuisines.length === 0) && isOwner && onEditCuisines && (
        <button
          onClick={onEditCuisines}
          className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-2.5 w-2.5" />
          Add cuisines
        </button>
      )}

      {/* User rating (My List mode only) */}
      {onRate && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">
            My rating
          </span>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(userRating === star ? null : star)}
              className="p-0"
            >
              <Star
                className={cn(
                  "h-4 w-4 transition-colors",
                  userRating != null && star <= userRating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40 hover:text-amber-300"
                )}
              />
            </button>
          ))}
        </div>
      )}

      {/* Add to My List button (All Restaurants mode) */}
      {onAdd && !isInMyList && (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          onClick={onAdd}
          disabled={isAdding}
        >
          <Plus className="h-3 w-3" />
          {isAdding ? "Adding..." : "Add to My List"}
        </Button>
      )}

      {onAdd && isInMyList && (
        <div className="flex items-center justify-center gap-1 text-xs text-green-600 py-1">
          <Check className="h-3 w-3" />
          In your list
        </div>
      )}
    </div>
  );
}
