tep 09 — User Ratings (1–5, Personal Only)

## Context
Completed:
- Step 01: Project scaffold
- Step 02: Supabase schema + RLS
- Step 03: Auth (Google login/logout)
- Step 04: Default list bootstrap
- Step 05: Google resolve
- Step 06: Import (restaurants + list_items + Yelp link fallback)
- Step 07: MVP UI loop (All Restaurants + My List)
- Step 08: Cuisine classification (owner-controlled)

This step introduces **personal restaurant ratings**.
Ratings are private to each user and do not affect global restaurant data.

## Goal (One Sentence)
Allow a logged-in user to rate restaurants in their own list from 1 to 5, and see only their own ratings.

## Core Principles
- Ratings are **user → restaurant** relationships
- Ratings are **personal and private**
- Ratings do NOT represent restaurant quality for others
- No aggregation, sharing, or recommendation logic

## Data Model (Already Exists)
Use the existing table:
- `user_restaurant_ratings`

Expected columns:
- user_id
- restaurant_id
- rating (integer, 1–5)

Constraints:
- Unique (user_id, restaurant_id)
- One rating per user per restaurant

No schema changes are allowed in this step.

## Permissions (VERY IMPORTANT)
A user may rate a restaurant only if:
- The user is authenticated
- The restaurant exists in the user’s own list (list_items)

A user may:
- Create a rating
- Update their own rating
- (Optional) Remove their rating

A user may NOT:
- Rate restaurants not in their list
- View or modify other users’ ratings

## API / Server Logic

### Rating Write Endpoint
Create one server route (example options):
- POST /api/ratings
- or PUT /api/restaurants/:id/rating

Behavior:
1) Require authenticated user
2) Validate restaurant_id exists
3) Verify restaurant is in the user’s list_items
   - If not, return 403
4) Validate rating:
   - Must be an integer
   - Must be between 1 and 5
5) Upsert into user_restaurant_ratings
   - Insert if not exists
   - Update if exists
6) Return the updated rating

Optional delete behavior (allowed but not required):
- Set rating to null
- Or provide DELETE endpoint

## UI Requirements

### Where to Show Rating
- Only in **My List** view
- Do NOT show rating input in All Restaurants view

### Rating Display
Each restaurant card in My List must show:
- User’s current rating (if exists)
- Or an empty rating state (“Rate” or empty stars)

### Rating Interaction (MVP)
- Display 5 stars (or equivalent UI)
- Clicking a star sets rating immediately
- Clicking another star updates rating
- No confirmation dialog required
- Optimistic UI update is allowed

No review text, comments, or likes.

## Read Logic
- My List page:
  - Join list_items → restaurants
  - Left join user_restaurant_ratings filtered by current user
- All Restaurants page:
  - Do NOT join ratings

## Row Level Security Expectations
RLS on user_restaurant_ratings must enforce:

- SELECT:
  - user_id == auth.uid()
- INSERT:
  - user_id == auth.uid()
- UPDATE:
  - user_id == auth.uid()
- DELETE:
  - user_id == auth.uid()

Client-side checks alone are not sufficient.

## Explicitly Out of Scope
The following must NOT be implemented in Step 09:
- Rating aggregation or averages
- Displaying other users’ ratings
- Sorting or filtering by rating
- Reviews or comments
- Recommendation logic
- Syncing with Google or Yelp ratings
- Writing to restaurants or restaurant_sources
- Sharing ratings publicly

## Acceptance Checklist
Step 09 is complete when:
- Users can rate restaurants in their own list (1–5)
- Ratings persist after page refresh
- Users cannot rate restaurants not in their list
- Users cannot see or modify other users’ ratings
- Updating a rating does not create duplicates
- No global restaurant data is modified

## Stop Condition
Stop after completing Step 09.

Do NOT proceed to:
- sharing or public lists
- recommendations
- review text
- OCR
- background jobs
- paid API integrations

If any requirement is unclear, ask before implementing.

