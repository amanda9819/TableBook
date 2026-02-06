/**
 * Build a Yelp search URL for a restaurant without calling the Yelp API.
 * Uses Yelp's public search page with restaurant name and location.
 */
export function buildYelpSearchUrl(name: string, address: string): string {
  const params = new URLSearchParams({
    find_desc: name,
    find_loc: address,
  });
  return `https://www.yelp.com/search?${params.toString()}`;
}
