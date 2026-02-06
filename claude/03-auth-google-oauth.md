tep 03 — Auth (Supabase Google OAuth) + Route Protection

## Context
Completed:
- Step 01: Project scaffold (Next.js App Router + TS + Tailwind + shadcn/ui + TanStack Query)
- Step 02: Supabase setup + SQL schema + RLS

This step implements **authentication only**.

## Goals
- Implement Google sign-in using Supabase Auth
- Ensure session persists across refresh
- Protect all app routes behind login EXCEPT:
  - `/share/:token` (public route; read-only later)
- Add a minimal “logged-in state” indicator on `/` to confirm auth works

## Constraints (VERY IMPORTANT)
- Do NOT implement business features (no resolve/import/rating/share creation)
- Do NOT modify database schema or RLS in this step
- Do NOT introduce new dependencies
- Keep UI minimal and mobile-friendly

## Tasks (DO ONLY THESE)

### 1) Auth Utilities (client)
Create a small auth utility module (preferred path: `/lib/auth/`):
- `signInWithGoogle()`
- `signOut()`
- `getSession()` (optional)
Notes:
- Must use the browser Supabase client (`/lib/db/supabaseClient.ts`)
- Use a redirect URL that works for local dev (e.g. `http://localhost:3000`)

### 2) Login Page
Create:
- `app/login/page.tsx`

Requirements:
- Simple mobile-first layout
- One button: “Continue with Google”
- On success: redirect to `/`
- If already logged in: redirect to `/`

### 3) Session-aware Home Page
Update `app/page.tsx` minimally:
- Show:
  - “Logged in as: <email>”
  - a “Sign out” button
- Do not build any restaurant UI yet

### 4) Route Protection (Auth Gate)
Implement route protection so that:
- Any route except `/login` and `/share/:token` requires authentication
- Unauthenticated users are redirected to `/login`

Choose ONE approach (pick the simplest and be consistent):

**Option A: Next.js Middleware (Recommended)**
- Add `middleware.ts`
- Redirect unauthenticated requests to `/login`
- Allow-list:
  - `/login`
  - `/share/*`
  - Next.js static paths (`/_next`, `/favicon.ico`, etc.)

**Option B: Layout Gate**
- Gate in a root layout wrapper (must be reliable across navigation)
- Ensure `/share/:token` bypass works

### 5) `.env.example` confirmation
Ensure `.env.example` documents required public values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do NOT include service role key in client env docs for this step.

## Output Requirements
In your response, include:
- File paths created/modified
- Code blocks for:
  - `app/login/page.tsx`
  - auth utility module(s)
  - `middleware.ts` OR the layout gate implementation
  - minimal changes to `app/page.tsx`
- Short local test instructions:
  - `pnpm dev`
  - visit `/` → redirected to `/login`
  - click Google login → redirected to `/`
  - refresh `/` remains logged in
  - sign out → redirected to `/login`

## Stop Condition
Stop after completing Step 03.
Do NOT proceed to:
- default list bootstrap
- restaurant resolve/import APIs
- list UI
- ratings UI
- sharing features

If anything is ambiguous, ask questions before coding.

