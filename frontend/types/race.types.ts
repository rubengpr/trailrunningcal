export interface PriceTier {
  until: string | null; // 'YYYY-MM-DD' when this price ends, null = final/default price
  price: number;
}

export type PriceValue = number | null | PriceTier[];

export interface TrailRace {
  id: string;
  name: string;
  date: string | null; // 'YYYY-MM-DD' or null if date TBD
  distanceKm: number;
  elevationGainM: number | null;
  priceEur?: PriceValue | null;
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
}
