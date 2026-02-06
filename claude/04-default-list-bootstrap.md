tep 04 — Default List Bootstrap (Ensure “My List” Exists)

## Context
Completed:
- Step 01: Project scaffold
- Step 02: Supabase schema + RLS
- Step 03: Supabase Google OAuth login/logout + route protection

Now users can log in. This step introduces the **first business-side write**:
- Ensure every authenticated user has a default list titled **“My List”**

## Goals
- On first authenticated app entry, ensure a default list exists for the current user
- If missing, create it (exactly once)
- Make this process idempotent (safe to call repeatedly)

## Constraints (VERY IMPORTANT)
- Do NOT implement restaurant resolve/import
- Do NOT implement list UI beyond minimal debug display (if needed)
- Do NOT introduce new dependencies
- Do NOT modify DB schema/RLS in this step (assume Step 02 is applied)
- Keep changes minimal and easy to reason about

## Tasks (DO ONLY THESE)

### 1) Create a server route to bootstrap the default list
Create:
- `app/api/bootstrap/route.ts` (POST)

Behavior:
- Require authenticated user (use server-side session)
- Query `lists` for `owner_id = current_user_id`
- If a list exists, return it (or return `{ ok: true }`)
- If none exists, insert a new list:
  - `owner_id = current_user_id`
  - `title = "My List"`
- Return minimal JSON:
  - `ok: true`
  - optionally `listId`

Notes:
- This route should use the **server-side Supabase client** (service role is OK, but prefer using the user session + RLS when possible).
- Must be safe if called multiple times.

### 2) Call bootstrap after login (minimal)
Add a minimal client-side hook that runs once when a user is authenticated:
- On app load (e.g., in home page or a small top-level component), call `POST /api/bootstrap`
- Only call it if user is logged in
- Do not create new UI pages; keep it minimal

### 3) Minimal verification output (optional but helpful)
On `/` page (or existing home page), display a small debug line:
- “Default list ensured” / “Bootstrap OK”
- optionally show the returned `listId`

No list UI is needed.

## Output Requirements
In your response, include:
- File paths created/modified
- Code blocks for:
  - `app/api/bootstrap/route.ts`
  - any small client hook or call site
  - minimal updates to `app/page.tsx` (if used for verification)
- Brief test instructions:
  - Login
  - Load `/`
  - Verify DB: `lists` now has 1 row for your `owner_id`
  - Refresh multiple times: it should not create duplicates

## Stop Condition
Stop after completing Step 04.
Do NOT proceed to:
- restaurant resolve/import
- list UI
- user ratings
- sharing features

If anything is ambiguous, ask questions before coding.

