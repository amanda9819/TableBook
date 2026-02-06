tep 06 — Import (Upsert Restaurant + Add to Default List + Yelp Link Fallback)

## Context
Completed:
- Step 01: Project scaffold
- Step 02: Supabase schema + RLS
- Step 03: Google OAuth login/logout + route protection
- Step 04: Default list bootstrap (“My List” exists for each user)
- Step 05: Google resolve returns place candidates (google_place_id, name, address, etc.)

This step introduces the first end-to-end “Add restaurant” write flow:
- Upsert into restaurants (global, de-duplicated by Google Place ID)
- Add a row into list_items for the current user’s default list
- Provide a Yelp link fallback WITHOUT calling Yelp API

## Goals (Acceptance Criteria)
After this step:
- A logged-in user can select a resolved candidate and click “Add”
- The system writes exactly one restaurant row per google_place_id (idempotent)
- The restaurant is added to the user’s default list (list_items)
- The UI can show a simple confirmation (“Added”)
- Each restaurant provides an “Open on Yelp” link without using Yelp API

## Core Principle
- Google Place ID is the canonical identifier for a physical restaurant location
- Yelp integration is optional and deferred
- No paid APIs are required for MVP

## Constraints (VERY IMPORTANT)
- Do NOT add new dependencies
- Do NOT expose Google keys to the client
- Do NOT call Yelp API
- Do NOT require Yelp API keys or subscriptions
- Do NOT implement scheduled refresh jobs
- Keep the import flow idempotent and safe to re-run

## Inputs / Contract
Create POST /api/import

Request payload:
- google_place_id (string)

Optional payload fields from resolve may be accepted for convenience:
- name
- formatted_address
- lat
- lng
- google_rating
- google_user_ratings_total

The server must be able to fetch Google Place Details itself if optional fields are not provided.

## Tasks (DO ONLY THESE)

### 1) Server API: Import Route
Create:
- POST app/api/import/route.ts

Behavior:
1) Require authenticated user
2) Ensure the current user has a default list (“My List”):
   - Find by owner_id + title
   - If missing, create it (idempotent)
3) Fetch Google Place Details (Places API New) for the provided google_place_id
   - Request only minimal fields needed for DB + display
4) Upsert into restaurants using google_place_id as the unique key:
   - Insert if new; update minimal fields if existing
   - Set created_by on INSERT only (do not overwrite on updates)
   - Cache Google rating fields if supported by schema
   - Update ratings_updated_at when Google rating fields are refreshed
5) Add the restaurant to the user’s default list:
   - Insert into list_items with:
     - list_id = default list id
     - restaurant_id = restaurants.id
     - status = "wish"
     - added_by = current user id
   - Ensure no duplicate list_items (rely on unique constraint or upsert semantics)

Return minimal JSON:
- ok: true
- restaurantId
- listItemId (optional)
- restaurant summary (optional)

### 2) Yelp Link Fallback (NO Yelp API)
Provide a Yelp link for each restaurant without calling Yelp API.

Approach:
- Use Yelp search URL format:
  - https://www.yelp.com/search?find_desc=<restaurant_name>&find_loc=<address_or_city>
- Build the URL using:
  - restaurant name
  - formatted address OR city/state (URL-encoded)

Rules:
- Do NOT store Yelp API keys
- Do NOT fetch Yelp data
- Do NOT attempt to guess yelp_business_id

This provides a safe, zero-cost way for users to view Yelp details.

### 3) Minimal UI Hook (Verification Only)
Extend the existing Step 05 test UI:
- Each resolved candidate has an “Add” button
- Clicking “Add” calls POST /api/import
- After import:
  - Show “Added” confirmation
  - Show an “Open on Yelp” link using the fallback URL

Do NOT build final list browsing UI yet.

## Output Requirements
Provide:
- File paths created/modified
- Full code blocks for:
  - app/api/import/route.ts
  - any helper functions used for Yelp URL generation
  - minimal UI changes (Add button + Yelp link)
- Test instructions:
  - Resolve a restaurant and Add it
  - Verify DB:
    - restaurants has exactly one row per google_place_id
    - list_items links the restaurant to the user’s default list
  - Re-add the same restaurant:
    - No duplicate restaurant
    - No duplicate list_item
  - Verify “Open on Yelp” opens a Yelp search page for the restaurant

## Future Extension (Explicitly Out of Scope)
- Yelp API integration (ratings, review counts)
- Yelp business ID matching
- Background rating refresh jobs
- Review content or excerpts
- Paid Yelp subscriptions

These may be introduced in later steps without breaking this design.

## Stop Condition
Stop after completing Step 06.
Do NOT proceed to:
- full list browsing UI
- user rating input UI
- sharing
- cuisine classification
- OCR
- background refresh jobs

If anything is ambiguous, ask questions before implementing.

