# Table Book

A collaborative restaurant discovery and wishlist app. Search for restaurants, build a personal list, track what you've visited, rate your favorites, and share your list with friends.

## Features

- **Restaurant Search** — Find restaurants by name or paste a Google Maps URL
- **Personal Wishlist** — Add restaurants to "My List" and mark them as wished or visited
- **Ratings** — Rate restaurants 1-5 stars
- **Cuisine Tagging** — Auto-classified from Google data, with manual editing
- **Shareable Lists** — Generate a public link to share your list with anyone
- **User Profiles** — Set a display name shown on cards and shared pages
- **Multi-User** — Filter the global restaurant list by who added them
- **Cuisine Filtering** — Filter restaurants by cuisine on both tabs

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript
- **Database & Auth**: Supabase (PostgreSQL + Google OAuth)
- **Client State**: TanStack Query
- **Styling**: Tailwind CSS 4, Radix UI, Lucide icons
- **APIs**: Google Places API (New), Yelp (link generation)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
GOOGLE_PLACES_API_KEY=<your-google-places-api-key>
YELP_API_KEY=<your-yelp-api-key>
```

### 3. Set up the database

Run the following SQL files in order in the [Supabase SQL Editor](https://supabase.com/dashboard):

1. `supabase/schema.sql` — Tables, indexes, RLS policies, triggers
2. `supabase/seed-cuisines.sql` — Seed 26 cuisine types
3. `supabase/12-user-profiles.sql` — User profiles table

### 4. Configure authentication

Enable **Google OAuth** in your Supabase project under Authentication > Providers.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Schema

| Table | Purpose |
|---|---|
| `cuisines` | Canonical cuisine taxonomy |
| `restaurants` | Global restaurant entities (from Google Places) |
| `restaurant_sources` | Cached raw API payloads |
| `restaurant_cuisines` | Many-to-many cuisine mapping |
| `lists` | Per-user list containers |
| `list_items` | Restaurants in a list (wish/visited status) |
| `shares` | Token-based list sharing |
| `user_restaurant_ratings` | Per-user 1-5 star ratings |
| `user_profiles` | Display names, avatars, bios, locations |

All tables have RLS enabled. Writes to `restaurants` and `restaurant_cuisines` go through a service role client that bypasses RLS.

## Project Structure

```
app/
  page.tsx              # Main app (All Restaurants + My List tabs)
  login/page.tsx        # Login page
  s/[token]/page.tsx    # Public shared list page
  api/
    bootstrap/          # Ensure user has a default list
    resolve/            # Search restaurants (Google Maps URL or text)
    import/             # Import restaurant + add to list
    cuisines/           # List all cuisines
    restaurant-cuisines/# Update cuisine tags
    ratings/            # Create/update/delete ratings
    shares/             # Create/revoke share links
    uploaders/          # Map user IDs to display names
    profile/            # Get/update user profile
components/             # UI components (restaurant-card, tab-bar, etc.)
hooks/                  # TanStack Query hooks
lib/
  types.ts              # Shared TypeScript types
  db/                   # Supabase client helpers
  auth/                 # Auth utilities
  google/               # Google Places API integration
  yelp/                 # Yelp link builder
supabase/               # SQL migrations and seeds
```
