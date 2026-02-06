tep 10 — Sharing Links (Public, Read-Only Lists)

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
- Step 09: User ratings (personal only)

At this point, users can fully manage their own restaurant lists.
This step enables **sharing a list via a public, read-only link**.

## Goal (One Sentence)
Allow a user to generate a public, shareable link for one of their lists, so anyone with the link can view the list without logging in.

## Core Principles
- Sharing is **explicit and opt-in**
- Shared content is **read-only**
- Sharing is **list-scoped**, not account-scoped
- No social interaction or collaboration is introduced

## Sharing Scope
Only the following data may be shared:
- List title
- Restaurants in the list
- Restaurant name, address, Google rating, cuisine (if available)
- “Open on Yelp” link (search-based fallback)

The following must NOT be shared:
- Personal user ratings (Step 09)
- Any private user metadata
- Other lists owned by the user

## Data Model (In Scope)
Use the existing or planned `shares` table.

Expected fields:
- id
- list_id
- token (unique, unguessable)
- created_by
- created_at
- revoked_at (nullable)

Assumptions:
- `list_id` references a list owned by `created_by`
- A share is active if revoked_at is null

## Permissions (VERY IMPORTANT)

- Only the list owner may:
  - Create a share link
  - Revoke a share link
- Anyone with a valid token may:
  - View the shared list (read-only)

No other permissions are granted.

## API / Server Logic

### 1) Create Share Link
Create a server route:

- POST /api/shares

Behavior:
1) Require authenticated user
2) Identify target list (default to “My List” if none specified)
3) Verify current user is the list owner
4) Generate a random, unguessable token
5) Insert a new row into shares
6) Return the share URL or token

If an active share already exists:
- Either reuse it
- Or revoke old and create new (implementation choice)

### 2) Revoke Share Link
Create a server route:

- POST /api/shares/revoke

Behavior:
1) Require authenticated user
2) Accept token or share_id
3) Verify current user is the list owner
4) Set revoked_at timestamp
5) Return success response

### 3) Public Read (Server-Side Only)
Shared list data must be fetched server-side using the token.

Behavior:
1) Look up share by token
2) If not found or revoked:
   - Return “Link expired or revoked”
3) Load list + list_items + restaurants
4) Return data for rendering

Do NOT expose service role credentials to the browser.

## Pages / Routes

### Authenticated UI
- In My List view:
  - Provide a “Share” button
  - Clicking generates or reveals a share link
  - Provide copy-to-clipboard interaction
  - Provide “Revoke link” action

Minimal UI is sufficient.

### Public Page
- Route: /s/[token]
- No authentication required

The page must display:
- List title (e.g. “Amanda’s List” or “Shared List”)
- Restaurant cards (read-only)
- Open on Yelp links

If token is invalid or revoked:
- Display a clear “This link is no longer available” message

## UI Constraints
- Public page must be read-only
- No “Add”, “Edit”, “Rate”, or “Share” actions
- No login prompt required to view

## Security Considerations
- Tokens must be long and unguessable
- Token lookup must not leak list existence
- Revoked links must immediately stop working

## RLS Expectations
- shares:
  - SELECT only via server routes
  - INSERT/UPDATE only when auth.uid() == created_by
- list_items and restaurants:
  - Public access only via server-side logic
  - Browser clients must not bypass RLS using anon access

## Explicitly Out of Scope
The following must NOT be implemented in Step 10:
- Collaborative editing
- Commenting or liking
- Sharing personal ratings
- Password-protected links
- Expiring links with timers
- Multiple permission levels (read/write)
- Email invitations or notifications
- Analytics or view counts

## Acceptance Checklist
Step 10 is complete when:
- A user can generate a shareable link for their list
- The link opens a public, read-only page without login
- Shared list content matches the user’s list
- Revoked links no longer work
- Non-owners cannot create or revoke share links
- No private or writable data is exposed publicly

## Stop Condition
Stop after completing Step 10.

Do NOT proceed to:
- collaborative features
- social feeds
- notifications
- advanced access control
- monetization
- background jobs

If any requirement is unclear, ask before implementing.

