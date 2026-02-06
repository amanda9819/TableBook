tep 02 — Supabase Basics + SQL Schema + RLS (Shared Restaurants + User Filterable Lists)

## Context
Previous step completed:
- Step 01: Project scaffold (Next.js App Router + TypeScript + Tailwind + shadcn/ui + TanStack Query provider)

This step sets up the **database foundation** and **Supabase clients**.

## Goals
- Add Supabase client setup (browser + server)
- Produce a single SQL file for MVP schema + constraints
- Add RLS policies that match the visibility model:
  - **All authenticated users can see all restaurants**
  - Restaurants display `created_by` (who imported)
  - **All authenticated users can view all users’ lists** (so we can filter by user_id)
  - Only list owner can edit their lists/items
  - User-generated restaurant ratings are **visible to all authenticated users**, but only the rating owner can create/update/delete their own rating.
- Support external rating caching in DB with **lazy refresh** (TTL-based), using a single `ratings_updated_at` timestamp

## Constraints (VERY IMPORTANT)
- Do NOT implement new UI pages in this step
- Do NOT implement business APIs (resolve/import/rating/share) in this step
- Do NOT introduce new dependencies
- Do NOT add cron/scheduled jobs
- Do NOT design fetching external ratings on every page view/request

## Tasks (DO ONLY THESE)

### 1) Supabase setup (code)
Create these files:

- `/lib/db/supabaseClient.ts`
  - Browser client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Should be safe for client-side use

- `/lib/db/supabaseServer.ts`
  - Server-only client using `SUPABASE_SERVICE_ROLE_KEY`
  - Must never be imported into client components

- Minimal helper for server routes (optional, but preferred)
  - e.g. `/lib/auth/serverSession.ts` or equivalent
  - Purpose: read current user session in Route Handlers

Environment variables expected (document in `.env.example` if not already):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2) SQL schema (single file)
Create **one** SQL file (path is your choice, but be explicit), e.g.:
- `/supabase/schema.sql` or `/sql/02_schema.sql`

It must include tables + constraints + indexes for:

#### `restaurants` (GLOBAL shared)
- Must include:
  - `created_by` (auth.users id)
  - `google_place_id` UNIQUE
  - `yelp_business_id` NULLABLE UNIQUE
  - cached external rating fields:
    - `google_rating`, `google_review_count`
    - `yelp_rating`, `yelp_review_count`
  - `ratings_updated_at` (single overall timestamp; updated only when a refresh succeeds)
- Notes:
  - Restaurants are global shared entities, not per-user copies

#### `restaurant_sources`
- Store raw payload snapshots for both sources:
  - `source` in ('google','yelp')
  - `payload` JSONB
  - `fetched_at` timestamp
- Purpose: debugging + future extraction + avoid re-fetching

#### `cuisines` + `restaurant_cuisines`
- `cuisines` is a structured taxonomy (normalized table)
- `restaurant_cuisines` is many-to-many mapping

#### `lists`
- Per-user list container:
  - `owner_id` is whose list it is
- Visibility model:
  - viewable by all authenticated users
  - editable only by owner

#### `list_items`
- Must include:
  - `list_id`
  - `restaurant_id`
  - UNIQUE (`list_id`, `restaurant_id`)
  - `status` in ('wish','visited')
  - optional `note`
  - `added_by` (auth.users id)
- Visibility model:
  - readable by all authenticated users
  - writable only by rating owner

#### `shares`
- `token` UNIQUE
- token-based share exists, but public access will be implemented later via server routes

#### `user_restaurant_ratings`
- Must include:
  - `user_id`
  - `restaurant_id`
  - UNIQUE (`user_id`, `restaurant_id`)
  - `rating` integer with CHECK (1..5)
  - optional `note`, optional `visited_at`
- Visibility model:
  - private to the rating owner (read/write only by that user)
- Notes:
  - Important: even though ratings are readable by all users, do NOT aggregate them into a shared/global restaurant score in MVP.

### 3) RLS Policies (MVP)
Enable RLS and create policies matching:

#### `restaurants`
- SELECT allowed for all authenticated users
- Client-side INSERT/UPDATE/DELETE should be disallowed
  - Writes will be done later via server routes using service role

#### `lists`
- SELECT allowed for all authenticated users
- INSERT/UPDATE/DELETE allowed only for owner (`owner_id = auth.uid()`)

#### `list_items`
- SELECT allowed for all authenticated users
- INSERT/UPDATE/DELETE allowed only if current user owns the parent list

#### `user_restaurant_ratings`
- SELECT allowed for all authenticated users (so users can view others' ratings)
- INSERT/UPDATE/DELETE allowed only for the rating owner (user_id = auth.uid())

#### `restaurant_sources`
- Server-write only for now (service role)
- If you allow reads, keep it restricted (prefer restrict in MVP if unsure)

#### `shares`
- Owner can create (later via API)
- Public read should be handled via server route using token (do NOT open RLS broadly)

### 4) External ratings refresh strategy (design note only)
- External ratings are cached in DB fields on `restaurants`
- Do NOT add cron jobs for MVP
- Intended approach is **lazy refresh with TTL** (e.g., if `ratings_updated_at` older than 24h, backend may refresh)
- If refresh fails, continue using cached values
- In this step: only ensure schema supports this (fields + timestamp). No refresh logic implementation.

## Output Requirements
In your response, include:
- File paths created/modified
- Full code for the Supabase client/server wrappers
- The full SQL file content
- A brief note on how to apply the SQL in Supabase (no long tutorial)

## Stop Condition
Stop after completing Step 02.
Do NOT proceed to auth pages, import APIs, UI pages, or any business features.
If anything is ambiguous, ask questions before coding.

