tep 07 — MVP UI Loop (All Restaurants + My List)

## Context
Completed:
- Step 01: Project scaffold
- Step 02: Supabase schema + RLS
- Step 03: Auth (Google login/logout)
- Step 04: Default list bootstrap
- Step 05: Google resolve
- Step 06: Import (restaurants + list_items + Yelp link fallback)

At this point, the backend supports a complete data flow.
This step focuses on exposing that data through a minimal, mobile-first UI.

## Goal (One Sentence)
Create a usable, mobile-first UI loop that allows users to:
- View all restaurants
- View their personal list
- Understand who uploaded each restaurant
- Add restaurants to their list
- Open Yelp for any restaurant (via search link fallback)

No new business logic is introduced.

## Core Principle
Step 07 is a **read-first UI step**.
It must only surface and lightly interact with data created in previous steps.

If a feature does not directly help users see or use existing data,
it is out of scope.

## Pages / Routes

### Required
- `/` (main page)

### Layout
- Mobile-first
- Two primary tabs or segmented control:
  - Tab 1: All Restaurants
  - Tab 2: My List

Do NOT introduce additional routes or navigation.

## Data Sources

### All Restaurants
Read from:
- `restaurants` (global)

Each restaurant card must display:
- name
- formatted address (or simplified city/state)
- Google rating (if available)
- Uploaded by (created_by)
- “Open on Yelp” link (search-based URL, no Yelp API)

Actions:
- If the restaurant is NOT in the user’s list:
  - Show “Add to My List” button
  - Clicking calls the existing POST /api/import
- If already added:
  - Indicate it is already in the list (disable or hide Add button)

### My List
Read from:
- `list_items`
- Joined with `restaurants`
- Only the current user’s default list (“My List”)

Each list item card must display:
- name
- formatted address (or simplified city/state)
- status (wish / visited)
- Google rating (if available)
- “Open on Yelp” link (search-based URL)

Optional (allowed but not required):
- Toggle list_item status between wish and visited

## Filtering (Minimal)
All Restaurants view must support a minimal uploader filter:
- Filter by `created_by`
- Default option: “All uploaders”

MVP implementation may use:
- A dropdown with distinct uploader identifiers
- Display format may be:
  - email
  - or shortened user id

No advanced filtering or search is required.

## Yelp Link Requirement (MANDATORY)
For every restaurant shown in Step 07:
- Provide an “Open on Yelp” link
- The link must be built using Yelp search URL format:
  - find_desc = restaurant name
  - find_loc = address or city/state
- Do NOT call Yelp API
- Do NOT require Yelp API keys
- Do NOT attempt to resolve yelp_business_id

This is a required user-visible feature in Step 07.

## Permissions & Access
- User must be authenticated to access the page
- All authenticated users may:
  - Read all restaurants
- Users may:
  - Add restaurants to their own list only
  - View only their own list items

No sharing logic is introduced in this step.

## Technical Constraints
- Use Next.js App Router + TypeScript
- Use Supabase browser client for reads
- All writes must go through existing server routes
- Do NOT add new dependencies
- Do NOT modify database schema

## Explicitly Out of Scope
The following must NOT be implemented in Step 07:
- Cuisine classification
- restaurant_cuisines writes
- restaurant_sources writes
- Yelp API integration
- User rating input (1–5)
- Sharing or public links
- OCR or screenshot upload
- Background jobs or refresh logic
- Pagination, advanced search, or sorting

## Acceptance Checklist
Step 07 is complete when:
- The app renders correctly on mobile width
- Users can switch between All Restaurants and My List
- All Restaurants shows uploader info and Google rating
- Users can add a restaurant to their list
- My List shows only the current user’s items
- Every restaurant has a working “Open on Yelp” link
- No new tables or background logic are introduced

## Stop Condition
Stop after completing Step 07.

Do NOT proceed to:
- cuisine tagging
- user ratings
- sharing
- OCR
- external data enrichment
- background refresh jobs

If any requirement is unclear, ask before implementing.

