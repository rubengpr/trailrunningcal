export interface TrailRace {
  date: string | null; // 'YYYY-MM-DD' or null if date TBD
  name: string;
  distanceKm: number;
  elevationGainM: number | null;
  priceEur: number | null;
  city: string;
  province: string;
  websiteUrl: string | null;
}
