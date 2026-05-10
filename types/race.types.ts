export interface PriceTier {
  until: string | null; // 'YYYY-MM-DD' when this price ends, null = final/default price
  price: number;
}

// Shape of a row in the races table as returned by Supabase
export type RaceRow = {
  id: string;
  name: string;
  date: string | null;
  distance_km: number;
  elevation_gain_m: number | null;
  race_tiers: Array<{ price_eur: number }> | null;
  city: string;
  province: string;
  description: string | null;
  map_url?: string | null;
  image_path?: string | null;
  services?: string[] | null;
  results_urls?: Array<{ year: number; url: string }> | null;
  sponsors?: string[] | null;
  organizer_id: string | null;
  website_url?: string | null;
  hero_image_filename?: string | null;
};

export interface ConflictingRace {
  id: string;
  name: string;
  date: string;
  websiteUrl: string;
}

export interface TrailRace {
  id: string;
  name: string;
  date: string | null; // 'YYYY-MM-DD' or null if date TBD
  distanceKm: number;
  elevationGainM: number | null;
  priceEur?: Array<{ price_eur: number }> | null;
  city: string;
  province: string;
  description: string | null;
  mapUrl?: string | null;
  imagePath?: string | null;
  services?: string[] | null;
  resultsUrls?: Array<{ year: number; url: string }> | null;
  sponsors?: string[] | null;
  organizerId: string | null;
  websiteUrl?: string | null;
  heroImageFilename?: string | null;
}
