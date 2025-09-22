export interface TrailRace {
  id: string;
  date: string; // 'YYYY-MM-DD'
  name: string;
  distanceKm: number;
  elevationGainM: number;
  priceEur: number | null;
  city: string;
  province: string;
  websiteUrl: string;
  difficulty: 'fácil' | 'moderado' | 'difícil' | 'experto';
}
