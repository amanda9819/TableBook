/**
 * Rule-based cuisine auto-classification from Google Places data.
 * Pure function — no DB access.
 */

/** Maps Google Places types to cuisine names (matching cuisines table) */
const GOOGLE_TYPE_TO_CUISINE: Record<string, string> = {
  american_restaurant: "American",
  mexican_restaurant: "Mexican",
  italian_restaurant: "Italian",
  chinese_restaurant: "Chinese",
  japanese_restaurant: "Japanese",
  korean_restaurant: "Korean",
  thai_restaurant: "Thai",
  vietnamese_restaurant: "Vietnamese",
  indian_restaurant: "Indian",
  mediterranean_restaurant: "Mediterranean",
  greek_restaurant: "Greek",
  french_restaurant: "French",
  spanish_restaurant: "Spanish",
  middle_eastern_restaurant: "Middle Eastern",
  brazilian_restaurant: "Brazilian",
  seafood_restaurant: "Seafood",
  barbecue_restaurant: "BBQ",
  pizza_restaurant: "Pizza",
  sushi_restaurant: "Sushi",
  vegan_restaurant: "Vegan/Vegetarian",
  vegetarian_restaurant: "Vegan/Vegetarian",
  cafe: "Bakery/Cafe",
  bakery: "Bakery/Cafe",
};

/** Maps lowercase name keywords to cuisine names */
const NAME_KEYWORD_TO_CUISINE: Record<string, string> = {
  sushi: "Japanese",
  ramen: "Japanese",
  izakaya: "Japanese",
  taco: "Mexican",
  taqueria: "Mexican",
  burrito: "Mexican",
  trattoria: "Italian",
  pizzeria: "Pizza",
  pho: "Vietnamese",
  banh: "Vietnamese",
  tandoori: "Indian",
  curry: "Indian",
  masala: "Indian",
  bibimbap: "Korean",
  bulgogi: "Korean",
  thai: "Thai",
  pad: "Thai",
  kebab: "Middle Eastern",
  falafel: "Middle Eastern",
  shawarma: "Middle Eastern",
  gyro: "Greek",
  souvlaki: "Greek",
  crepe: "French",
  bistro: "French",
  brasserie: "French",
  tapas: "Spanish",
  ethiopian: "Ethiopian",
  injera: "Ethiopian",
  cajun: "Cajun",
  gumbo: "Cajun",
  jambalaya: "Cajun",
  jerk: "Caribbean",
  poke: "Hawaiian",
  bbq: "BBQ",
  barbecue: "BBQ",
  smokehouse: "BBQ",
  bakery: "Bakery/Cafe",
  cafe: "Bakery/Cafe",
  café: "Bakery/Cafe",
  vegan: "Vegan/Vegetarian",
  seafood: "Seafood",
  ceviche: "Peruvian",
  churrasco: "Brazilian",
};

/**
 * Classify a restaurant into 0–2 cuisine names based on Google Places types
 * and the restaurant name.
 */
export function classifyCuisines(types: string[], name: string): string[] {
  const matched = new Set<string>();

  // 1) Check Google types
  for (const type of types) {
    const cuisine = GOOGLE_TYPE_TO_CUISINE[type];
    if (cuisine) {
      matched.add(cuisine);
    }
  }

  // 2) Check name keywords (only if we haven't hit 2 yet)
  if (matched.size < 2) {
    const lowerName = name.toLowerCase();
    for (const [keyword, cuisine] of Object.entries(NAME_KEYWORD_TO_CUISINE)) {
      if (lowerName.includes(keyword)) {
        matched.add(cuisine);
        if (matched.size >= 2) break;
      }
    }
  }

  return [...matched].slice(0, 2);
}
