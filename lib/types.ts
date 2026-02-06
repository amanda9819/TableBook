export type Restaurant = {
  id: string;
  created_by: string;
  name: string;
  address: string;
  google_place_id: string;
  google_rating: number | null;
  google_review_count: number | null;
  created_at: string;
};

export type ListItem = {
  id: string;
  list_id: string;
  restaurant_id: string;
  added_by: string;
  status: "wish" | "visited";
  note: string | null;
  created_at: string;
  restaurant: Restaurant;
};

export type UploaderMap = Record<string, string>;

export type Cuisine = {
  id: string;
  name: string;
};

export type RestaurantCuisine = {
  id: string;
  restaurant_id: string;
  cuisine_id: string;
  source: string;
  cuisine: Cuisine;
};
