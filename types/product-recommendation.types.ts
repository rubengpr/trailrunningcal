import type { Locale } from '@/i18n';

export type RecommendationVariant = 'control' | 'naak' | 'baouw';
export type PriceVariant = 'control' | 'show-price' | 'show-discount';
export type ShoeVariant = 'control' | 'asics';
export type ShoeBrand = 'kailas' | 'asics';
export type ProductId = 'naak-boost-gel' | 'naak-ultra-drink' | 'baouw-gel' | 'baouw-puree' | 'leki-ultratrail'
  | 'kailas-fuga-ex-3' | 'kailas-fuga-du-2' | 'kailas-fuga-ex-pro' | 'kailas-fuga-ex-330'
  | 'asics-fuji-lite-7' | 'asics-trabuco-14' | 'asics-metafuji-trail-2' | 'asics-trabuco-max-5';
export type DistanceBand = 'short' | 'medium' | 'marathon' | 'ultra';

export interface RecommendedProduct {
  id: ProductId;
  brand: 'Näak' | 'Baouw' | 'LEKI' | 'Kailas FUGA' | 'ASICS';
  category: 'nutrition' | 'poles' | 'shoes';
  image: string;
  url: string;
  priceEur: number;
  originalPriceEur?: number;
}

export interface RecommendationContext {
  event_id: string;
  event_slug: string;
  race_id: string;
  distance_km: number;
  elevation_gain_m: number | null;
  distance_band: DistanceBand;
  locale: Locale;
  recommendation_variant: RecommendationVariant;
  catalog_version: 'v3';
  recommendation_placement: 'after_distances';
  '$feature/race-product-recommendations': RecommendationVariant;
  price_variant: PriceVariant | null;
  '$feature/race-product-price'?: PriceVariant;
  shoe_variant: ShoeVariant | null;
  '$feature/race-product-shoes'?: ShoeVariant;
}

export interface ProductInteraction extends RecommendationContext {
  product_id: ProductId;
  brand: RecommendedProduct['brand'];
  category: RecommendedProduct['category'];
  position: number;
  destination_url: string;
  layout: 'mobile' | 'desktop';
  price_placement: 'row' | 'details';
  reference_price_eur: number | null;
  discount_shown: boolean;
}
