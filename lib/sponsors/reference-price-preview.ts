import type { ProductId, RecommendedProduct } from '@/types/product-recommendation.types';

// Fictitious mock-up amounts for visual review only. They are not verified provider prices or real discounts.
const SIMULATED_PRICES: Record<ProductId, { priceEur: number; originalPriceEur: number }> = {
  'naak-boost-gel': { priceEur: 3.5, originalPriceEur: 4.5 },
  'naak-ultra-drink': { priceEur: 4, originalPriceEur: 5 },
  'baouw-gel': { priceEur: 3.25, originalPriceEur: 4 },
  'baouw-puree': { priceEur: 3.25, originalPriceEur: 4 },
  'leki-ultratrail': { priceEur: 180, originalPriceEur: 220 },
  'kailas-fuga-ex-3': { priceEur: 144, originalPriceEur: 160 },
  'kailas-fuga-du-2': { priceEur: 190, originalPriceEur: 230 },
  'kailas-fuga-ex-pro': { priceEur: 250, originalPriceEur: 300 },
  'kailas-fuga-ex-330': { priceEur: 180, originalPriceEur: 220 },
  'asics-fuji-lite-7': { priceEur: 140, originalPriceEur: 170 },
  'asics-trabuco-14': { priceEur: 160, originalPriceEur: 195 },
  'asics-metafuji-trail-2': { priceEur: 250, originalPriceEur: 280 },
  'asics-trabuco-max-5': { priceEur: 180, originalPriceEur: 190 },
};

export function isReferencePricePreview(value: string | undefined): boolean {
  return value === 'simulated';
}

export function withSimulatedReferencePrice(product: RecommendedProduct): RecommendedProduct {
  return { ...product, ...SIMULATED_PRICES[product.id] };
}
