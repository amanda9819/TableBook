tep 01 — Scaffold the Project (Next.js App Router + TypeScript)

## Context
This is the first implementation step after establishing the global system prompt.

Goal is to create a runnable skeleton project with the agreed baseline tooling.

## Goals
- Scaffold a **Next.js App Router** project using **TypeScript**
- Enable **Tailwind CSS**
- Install and verify **shadcn/ui** (use at least one component in the UI)
- Wire **TanStack Query (React Query)** at the app root
- Create a minimal folder structure:
  - `/app`
  - `/components`
  - `/lib`

## Constraints (VERY IMPORTANT)
- Do NOT set up Supabase in this step
- Do NOT write any database schema or RLS
- Do NOT implement any business APIs (resolve/import/rating/share)
- Do NOT add product features (no list UI, no restaurant UI beyond a placeholder)
- Do NOT introduce additional dependencies beyond what’s required for:
  - Tailwind
  - shadcn/ui
  - TanStack Query

## Tasks (DO ONLY THESE)

### 1) Create the project
- Use Next.js **App Router** (not Pages Router)
- TypeScript enabled

### 2) Styling: Tailwind CSS
- Ensure Tailwind is fully configured and applied
- `app/globals.css` must include Tailwind directives

### 3) UI library: shadcn/ui
- Initialize shadcn/ui
- Add at least one component (e.g. Button or Card)
- Use that component on the home page to verify installation

### 4) Data fetching foundation: TanStack Query
- Add TanStack Query
- Create a `Providers` component (or similar) that sets up:
  - `QueryClient`
  - `QueryClientProvider`
- Ensure it is wired in the root layout (e.g. `app/layout.tsx`)

### 5) Minimal pages
- `app/page.tsx` should render a simple “App is running” page
- Display one shadcn/ui component on the page (e.g. a Button)

### 6) Repo hygiene
- Add `.env.example` (even if empty placeholders for now)
- Ensure `pnpm dev` runs without errors

## Output Requirements
In your response, include:
- Exact commands to scaffold the project and install deps
- File paths created/modified
- Code blocks for key files:
  - `app/layout.tsx`
  - `app/page.tsx`
  - `app/globals.css`
  - the Query provider file (e.g. `/components/providers.tsx`)

## Stop Condition
Stop after completing Step 01.
Do NOT proceed to Supabase, SQL schema, auth, or any business logic.
If anything is ambiguous, ask questions before coding.

