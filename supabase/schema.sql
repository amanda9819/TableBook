-- ============================================================
-- Restaurant List MVP Schema
-- Step 02: Tables + Constraints + Indexes + RLS Policies
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- Cuisines: Structured taxonomy (normalized)
CREATE TABLE cuisines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restaurants: Global shared entities
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Basic info
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  website TEXT,

  -- External IDs
  google_place_id TEXT UNIQUE NOT NULL,
  yelp_business_id TEXT UNIQUE,

  -- Cached external ratings
  google_rating NUMERIC(2,1),
  google_review_count INTEGER,
  yelp_rating NUMERIC(2,1),
  yelp_review_count INTEGER,
  ratings_updated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restaurant Sources: Raw API payload snapshots
CREATE TABLE restaurant_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('google', 'yelp')),
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (restaurant_id, source)
);

-- Restaurant Cuisines: Many-to-many mapping
CREATE TABLE restaurant_cuisines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  cuisine_id UUID NOT NULL REFERENCES cuisines(id) ON DELETE CASCADE,
  source TEXT CHECK (source IN ('google', 'yelp', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (restaurant_id, cuisine_id)
);

-- Lists: Per-user list containers
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL DEFAULT 'My List',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- List Items: Restaurants in a list
CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'wish' CHECK (status IN ('wish', 'visited')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (list_id, restaurant_id)
);

-- Shares: Token-based list sharing
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- User Restaurant Ratings: Per-user ratings
CREATE TABLE user_restaurant_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  note TEXT,
  visited_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, restaurant_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Restaurants
CREATE INDEX idx_restaurants_created_by ON restaurants(created_by);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_ratings_updated_at ON restaurants(ratings_updated_at);

-- Restaurant Sources
CREATE INDEX idx_restaurant_sources_restaurant_id ON restaurant_sources(restaurant_id);

-- Restaurant Cuisines
CREATE INDEX idx_restaurant_cuisines_restaurant_id ON restaurant_cuisines(restaurant_id);
CREATE INDEX idx_restaurant_cuisines_cuisine_id ON restaurant_cuisines(cuisine_id);

-- Lists
CREATE INDEX idx_lists_owner_id ON lists(owner_id);

-- List Items
CREATE INDEX idx_list_items_list_id ON list_items(list_id);
CREATE INDEX idx_list_items_restaurant_id ON list_items(restaurant_id);
CREATE INDEX idx_list_items_status ON list_items(status);

-- Shares
CREATE INDEX idx_shares_list_id ON shares(list_id);
CREATE INDEX idx_shares_token ON shares(token);

-- User Restaurant Ratings
CREATE INDEX idx_user_restaurant_ratings_user_id ON user_restaurant_ratings(user_id);
CREATE INDEX idx_user_restaurant_ratings_restaurant_id ON user_restaurant_ratings(restaurant_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE cuisines ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_cuisines ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurant_ratings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Cuisines: Read-only for authenticated users
-- ------------------------------------------------------------
CREATE POLICY "Cuisines are viewable by authenticated users"
  ON cuisines FOR SELECT
  TO authenticated
  USING (true);

-- ------------------------------------------------------------
-- Restaurants: Readable by all authenticated, writable via service role only
-- ------------------------------------------------------------
CREATE POLICY "Restaurants are viewable by authenticated users"
  ON restaurants FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- Writes happen via service role in server routes

-- ------------------------------------------------------------
-- Restaurant Sources: Server-only (service role)
-- ------------------------------------------------------------
-- No policies for authenticated users - service role only

-- ------------------------------------------------------------
-- Restaurant Cuisines: Readable by authenticated users
-- ------------------------------------------------------------
CREATE POLICY "Restaurant cuisines are viewable by authenticated users"
  ON restaurant_cuisines FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- Writes happen via service role in server routes

-- ------------------------------------------------------------
-- Lists: Viewable by all authenticated, editable by owner only
-- ------------------------------------------------------------
CREATE POLICY "Lists are viewable by authenticated users"
  ON lists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own lists"
  ON lists FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own lists"
  ON lists FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own lists"
  ON lists FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ------------------------------------------------------------
-- List Items: Viewable by all authenticated, editable by list owner only
-- ------------------------------------------------------------
CREATE POLICY "List items are viewable by authenticated users"
  ON list_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add items to their own lists"
  ON list_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_id
      AND lists.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in their own lists"
  ON list_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_id
      AND lists.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_id
      AND lists.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from their own lists"
  ON list_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_id
      AND lists.owner_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- Shares: Owner can manage, public read via server route (not RLS)
-- ------------------------------------------------------------
CREATE POLICY "Users can view shares for their own lists"
  ON shares FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_id
      AND lists.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their own lists"
  ON shares FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_id
      AND lists.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete shares for their own lists"
  ON shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_id
      AND lists.owner_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- User Restaurant Ratings: Viewable by all, editable by owner only
-- ------------------------------------------------------------
CREATE POLICY "Ratings are viewable by authenticated users"
  ON user_restaurant_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own ratings"
  ON user_restaurant_ratings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ratings"
  ON user_restaurant_ratings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own ratings"
  ON user_restaurant_ratings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS: Auto-update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_list_items_updated_at
  BEFORE UPDATE ON list_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_restaurant_ratings_updated_at
  BEFORE UPDATE ON user_restaurant_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
