export interface TrailRace {
  date: string | null; // 'YYYY-MM-DD' or null if date TBD
  name: string;
  distanceKm: number;
  elevationGainM: number | null;
  priceEur: number | null;
  city: string;
  province: string;
  websiteUrl: string | null;
  isVerifiedOrganizer?: boolean; // Optional: true if organizer is verified
  raceDescriptionStart?: string | null;
  raceDescriptionEnd?: string | null;
  raceUrl: string | null;
}
