tep 08 — Cuisine Classification (Controlled Editing)

## Context
Completed:
- Step 01: Project scaffold
- Step 02: Supabase schema + RLS
- Step 03: Auth (Google login/logout)
- Step 04: Default list bootstrap
- Step 05: Google resolve
- Step 06: Import (restaurants + list_items + Yelp link fallback)
- Step 07: MVP UI loop (All Restaurants + My List)

At this point, restaurants are visible and usable.
This step adds structured cuisine information with controlled edit permissions.

## Goal (One Sentence)
Provide visible cuisine labels for restaurants and allow cuisine edits **only by the user who uploaded/added the restaurant**, using a minimal and maintainable classification system.

## Core Principle
- Cuisine is shared metadata, not personal preference
- Cuisine editing is **ownership-based**, not crowd-sourced
- Classification must be explainable, lightweight, and reversible

## Data Model (In Scope)
This step introduces writes to:
- `restaurant_cuisines` (many-to-many between restaurants and cuisines)

Assumptions:
- A `cuisines` reference table exists (or will be created) containing canonical cuisine values
- `restaurants.created_by` identifies the uploader/adder of the restaurant

## Permissions (VERY IMPORTANT)
Cuisine editing permissions are restricted as follows:

- All authenticated users:
  - Can VIEW cuisine labels for all restaurants
- Only the user who uploaded/added the restaurant:
  - Can ADD cuisines
  - Can REMOVE cuisines

Definition of uploader:
- The user whose id equals `restaurants.created_by`

No other users may modify cuisine data.

## Automatic Initial Classification (MVP)
Provide an initial, best-effort cuisine assignment when possible.

Allowed sources (choose one or both):
- Google Place Details fields (types or categories)
- Keyword matching from restaurant name

Rules:
- Mapping must be explicit and rule-based (no ML)
- Store only 0–N cuisines (prefer 1–2)
- If no confident match exists, leave cuisine empty

Automatic classification must NOT override manual edits.

## API / Server Logic

### Cuisine Assignment Route
Create a server route to update cuisines for a restaurant.

Responsibilities:
1) Require authenticated user
2) Load restaurant by id
3) Verify current user == restaurants.created_by
   - If not, return 403
4) Validate cuisine ids against `cuisines` table
5) Replace existing `restaurant_cuisines` entries with the new set
6) Return updated cuisine list

No partial updates are required (replace-all is acceptable).

## UI Requirements

### Cuisine Display
- Display cuisine as lightweight badges on restaurant cards
- Max 2 visible badges per card
- Cuisine badges are read-only for non-owners

### Cuisine Edit UI
- Only visible to restaurant owner (created_by)
- Simple interaction:
  - “Edit cuisines” action
  - Modal or inline selector
  - Multi-select dropdown or checkbox list
- No free-text input (must select from predefined cuisines)

## Filtering (Optional but Allowed)
- All Restaurants view may support filtering by cuisine
- Single-select filter is sufficient
- Filter is read-only (does not affect data)

## RLS Expectations
Row Level Security must enforce:
- SELECT on cuisines and restaurant_cuisines for all authenticated users
- INSERT / DELETE on restaurant_cuisines only when:
  - auth.uid() == restaurants.created_by

No client-side checks alone are sufficient; permission must be enforced server-side.

## Explicitly Out of Scope
The following must NOT be implemented in Step 08:
- Yelp API integration
- restaurant_sources writes
- Background jobs or scheduled refresh
- ML-based classification
- OCR or image-based cuisine detection
- Public editing or crowd-sourced cuisine changes
- Complex cuisine hierarchies or nesting
- Admin dashboards

## Acceptance Checklist
Step 08 is complete when:
- Restaurants display cuisine badges when classified
- Only the uploader sees the “Edit cuisines” option
- Unauthorized users cannot modify cuisine (403 enforced)
- Cuisine edits persist after refresh
- Automatic classification does not override manual edits
- No other tables are modified

## Stop Condition
Stop after completing Step 08.

Do NOT proceed to:
- user ratings
- sharing
- recommendations
- OCR
- background enrichment
- paid API integrations

If any requirement is unclear, ask before implementing.

