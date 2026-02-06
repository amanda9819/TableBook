step 05 — Google Resolve (Search & Branch Disambiguation)

## Context
Completed:
- Step 01: Project scaffold
- Step 02: Supabase schema + RLS
- Step 03: Google OAuth login/logout + route protection
- Step 04: Default list bootstrap (“My List” exists for each user)

This step implements **restaurant resolving only**.
No database writes are allowed in this step.

## Goals (Acceptance Criteria)
After this step:
- A user can submit a restaurant name or a Google Maps URL
- The system returns a list of candidate Google Places
- If a restaurant has multiple branches, multiple candidates are returned
- The system does NOT automatically choose a branch
- Each candidate includes a Google Place ID for the next step (import)

## Core Principle (CRITICAL)
- One Google Place ID represents one physical restaurant location
- Same-name restaurants in different locations are treated as different restaurants
- Branch disambiguation must be handled explicitly by user choice

Do NOT attempt to merge branches or introduce brand-level entities.

## Constraints (VERY IMPORTANT)
- Do NOT write to the database
- Do NOT import restaurants
- Do NOT call Yelp API
- Do NOT create list_items
- Do NOT add new dependencies
- Keep this step strictly read-only and resolve-only
- Do NOT use legacy Places endpoints (textsearch/details). Use Places API (New) only.

## Supported Input
Implement POST /api/resolve that accepts a single string input called `query`.

The query may be:
- A restaurant name (free text, optionally including city or neighborhood)
- A Google Maps URL (short or long)

Example queries:
- Din Tai Fung
- Din Tai Fung Cupertino
- A Google Maps place URL

## Tasks (DO ONLY THESE)

### 1) Google Places Client Wrapper (lib)
Create or update a minimal Google Places client wrapper (suggested path: /lib/google/) using Places API (New) only.

It must support:
- Free-text search using Places API (New) Search Text (places:searchText)
- Place details lookup using Places API (New) (places/{placeId}) when needed

Requirements:
- Google API key must be server-side only (env var GOOGLE_PLACES_API_KEY)
- Do not expose keys to the client
- Use fetch only (no new deps)
- Requests must include headers:
  - X-Goog-Api-Key
  - X-Goog-FieldMask (request only fields needed for disambiguation)

### 2) Resolve API Route
Create:
- app/api/resolve/route.ts (POST)

Behavior:
- If the input is a Google Maps URL:
  - Resolve it to a single Google Place candidate when possible (often 1 result)
- If the input is free text:
  - Use Places API (New) Search Text
  - Return multiple candidates when multiple branches exist

Response format:
- Return an object containing a `candidates` array
- Each candidate must include at least:
  - google_place_id
  - name
  - formatted_address
- Optional fields (if available):
  - latitude / longitude
  - rating
  - user_ratings_total

Mapping note:
- The wrapper should map Places API (New) fields into our stable candidate shape:
  google_place_id, name, formatted_address, lat/lng, rating, user_ratings_total (when available).

### 3) Branch Disambiguation Requirement
When multiple candidates are returned:
- All reasonable matches must be included
- The API must NOT auto-select a single candidate
- Final selection is deferred to later UI steps

### 4) Minimal Verification (Choose ONE)
Provide one minimal verification method:
- Option A: Add a very small temporary input + output section on an existing page to call /api/resolve and display candidate names and addresses
- Option B: Document how to call /api/resolve manually (for example, via curl or REST client)

Do NOT build final UI in this step.

## Output Requirements
Your response must include:
- A list of files created or modified
- Full code for:
  - The Google Places client wrapper
  - app/api/resolve/route.ts
  - Any minimal verification code (if Option A is chosen)
- Short testing notes:
  - A multi-branch restaurant name should return multiple candidates
  - A Google Maps URL should return a single candidate
  - If you see REQUEST_DENIED mentioning "legacy API", you are still calling legacy endpoints.

## Stop Condition
Stop after completing Step 05.
Do NOT proceed to:
- Restaurant import
- Database writes
- List UI
- User ratings
- Sharing features
- Yelp integration

If anything is ambiguous, ask questions before implementing.

