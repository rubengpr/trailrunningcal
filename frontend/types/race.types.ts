export interface PriceTier {
  until: string | null; // 'YYYY-MM-DD' when this price ends, null = final/default price
  price: number;
}

export type PriceValue = number | null | PriceTier[];

export interface TrailRace {
  date: string | null; // 'YYYY-MM-DD' or null if date TBD
  name: string;
  distanceKm: number;
  elevationGainM: number | null;
  priceEur: PriceValue;
  city: string;
  province: string;
  websiteUrl: string | null;
  isVerifiedOrganizer?: boolean; // Optional: true if organizer is verified
  raceDescriptionStart?: { es: string; ca: string } | null;
  raceDescriptionEnd?: { es: string; ca: string } | null;
  raceUrl?: string | null;
  imagePath?: string | null;
  mapUrl?: string | null;
  services?: string[];
  resultsUrls?: Array<{ year: number; url: string }>;
  sponsors?: string[];
}
