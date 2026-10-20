import type { DistanceBand, PriceVariant, ProductId, RecommendationVariant, RecommendedProduct, ShoeBrand, ShoeVariant } from '@/types/product-recommendation.types';

export const RECOMMENDATIONS_FLAG = 'race-product-recommendations';
export const PRICE_FLAG = 'race-product-price';
export const SHOES_FLAG = 'race-product-shoes';

export function getShoeVariant(value: string | boolean | undefined): ShoeVariant | null {
  return value === 'control' || value === 'asics' ? value : null;
}

export function getPriceVariant(value: string | boolean | undefined): PriceVariant | null {
  return value === 'control' || value === 'show-price' || value === 'show-discount' ? value : null;
}

const PRODUCTS: Record<ProductId, RecommendedProduct> = {
  'naak-boost-gel': {
    priceEur: 3.5, originalPriceEur: 4.5,
    id: 'naak-boost-gel', brand: 'Näak', category: 'nutrition',
    image: '/assets/sponsors/products/naak-boost-gel.webp',
    url: 'https://eu.naak.com/products/boost-gel-30-neutral',
  },
  'naak-ultra-drink': {
    priceEur: 4, originalPriceEur: 5,
    id: 'naak-ultra-drink', brand: 'Näak', category: 'nutrition',
    image: '/assets/sponsors/products/naak-ultra-drink.webp',
    url: 'https://eu.naak.com/products/ultra-drink-mix-250-watermelon-single-serve',
  },
  'baouw-gel': {
    priceEur: 3.25, originalPriceEur: 4,
    id: 'baouw-gel', brand: 'Baouw', category: 'nutrition',
    image: '/assets/sponsors/products/baouw-gel.webp',
    url: 'https://www.baouw-organic-nutrition.com/shop/gel-energetique-framboise-grenade-1634',
  },
  'baouw-puree': {
    priceEur: 3.25, originalPriceEur: 4,
    id: 'baouw-puree', brand: 'Baouw', category: 'nutrition',
    image: '/assets/sponsors/products/baouw-puree.webp',
    url: 'https://www.baouw-organic-nutrition.com/shop/purees-energetiques-4/compote-energetique-bio-salee-patatedouce-carotte-poivretimut-915',
  },
  'leki-ultratrail': {
    priceEur: 180, originalPriceEur: 220,
    id: 'leki-ultratrail', brand: 'LEKI', category: 'poles',
    image: '/assets/sponsors/products/leki-ultratrail-folded.webp',
    url: 'https://www.leki.com/int/en/Ultratrail-FX.One/65625851110',
  },
  'kailas-fuga-ex-3': {
    id: 'kailas-fuga-ex-3', brand: 'Kailas FUGA', category: 'shoes', priceEur: 144, originalPriceEur: 160,
    image: '/assets/sponsors/products/kailas-fuga-ex-3.webp',
    url: 'https://www.kailasfuga.com/products/2025-new-kailas-fuga-ex-3-trail-running-shoes-mens?variant=53545285026157',
  },
  'kailas-fuga-du-2': {
    id: 'kailas-fuga-du-2', brand: 'Kailas FUGA', category: 'shoes', priceEur: 190, originalPriceEur: 230,
    image: '/assets/sponsors/products/kailas-fuga-du-2.webp',
    url: 'https://www.kailasfuga.com/products/kailas-fuga-du-2-trail-running-shoes-mens?variant=51900190687597',
  },
  'kailas-fuga-ex-pro': {
    id: 'kailas-fuga-ex-pro', brand: 'Kailas FUGA', category: 'shoes', priceEur: 250, originalPriceEur: 300,
    image: '/assets/sponsors/products/kailas-fuga-ex-pro.webp',
    url: 'https://www.kailasfuga.com/products/kailas-fuga-ex-pro-mountain-running-shoes-unisex?variant=53823331205485',
  },
  'kailas-fuga-ex-330': {
    id: 'kailas-fuga-ex-330', brand: 'Kailas FUGA', category: 'shoes', priceEur: 180, originalPriceEur: 220,
    image: '/assets/sponsors/products/kailas-fuga-ex-330.webp',
    url: 'https://www.kailasfuga.com/products/2025-new-kailas-fuga-ex-330-trail-running-shoes-mens?variant=52048352543085',
  },
  'asics-fuji-lite-7': {
    id: 'asics-fuji-lite-7', brand: 'ASICS', category: 'shoes', priceEur: 140, originalPriceEur: 170,
    image: '/assets/sponsors/products/asics-fuji-lite-7.webp',
    url: 'https://www.asics.com/es/es-es/fuji-lite-7/p/1013A232-400.html',
  },
  'asics-trabuco-14': {
    id: 'asics-trabuco-14', brand: 'ASICS', category: 'shoes', priceEur: 160, originalPriceEur: 195,
    image: '/assets/sponsors/products/asics-trabuco-14.webp',
    url: 'https://www.asics.com/es/es-es/trabuco--14/p/1011C166-750.html',
  },
  'asics-metafuji-trail-2': {
    id: 'asics-metafuji-trail-2', brand: 'ASICS', category: 'shoes', priceEur: 250, originalPriceEur: 280,
    image: '/assets/sponsors/products/asics-metafuji-trail-2.webp',
    url: 'https://www.asics.com/es/es-es/metafuji-trail-2/p/1013A178-750.html',
  },
  'asics-trabuco-max-5': {
    id: 'asics-trabuco-max-5', brand: 'ASICS', category: 'shoes', priceEur: 180, originalPriceEur: 190,
    image: '/assets/sponsors/products/asics-trabuco-max-5.webp',
    url: 'https://www.asics.com/es/es-es/trabuco--max-5/p/1011C164-600.html',
  },
};

const shoesByDistance: Record<ShoeBrand, Record<DistanceBand, ProductId>> = {
  kailas: {
    short: 'kailas-fuga-ex-3',
    medium: 'kailas-fuga-du-2',
    marathon: 'kailas-fuga-ex-pro',
    ultra: 'kailas-fuga-ex-330',
  },
  asics: {
    short: 'asics-fuji-lite-7',
    medium: 'asics-trabuco-14',
    marathon: 'asics-metafuji-trail-2',
    ultra: 'asics-trabuco-max-5',
  },
};

export function getDistanceBand(distanceKm: number): DistanceBand {
  if (distanceKm >= 50) return 'ultra';
  if (distanceKm >= 40) return 'marathon';
  if (distanceKm >= 20) return 'medium';
  return 'short';
}

export function getVariant(value: string | boolean | undefined): RecommendationVariant | null {
  return value === 'control' || value === 'naak' || value === 'baouw' ? value : null;
}

export function getProductRecommendations(distanceKm: number, elevationGainM: number | null, brand: Exclude<RecommendationVariant, 'control'>, shoeBrand: ShoeBrand = 'kailas'): RecommendedProduct[] {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return [];
  const products: RecommendedProduct[] = [PRODUCTS[shoesByDistance[shoeBrand][getDistanceBand(distanceKm)]]];
  if (distanceKm >= 15) {
    const id = brand === 'naak'
      ? (distanceKm >= 50 ? 'naak-ultra-drink' : 'naak-boost-gel')
      : (distanceKm >= 50 ? 'baouw-puree' : 'baouw-gel');
    products.push(PRODUCTS[id]);
  }
  if (elevationGainM !== null && Number.isFinite(elevationGainM) && elevationGainM >= 0) {
    const density = elevationGainM / distanceKm;
    const vertical = distanceKm <= 8 && elevationGainM >= 500 && density >= 100;
    const mountainRace = distanceKm >= 20 && (elevationGainM >= 1500 || density >= 60);
    if (vertical || mountainRace) products.push(PRODUCTS['leki-ultratrail']);
  }
  return products;
}

export function buildProductUrl(product: RecommendedProduct): string {
  const url = new URL(product.url);
  url.searchParams.set('utm_source', 'trailrunningcal');
  url.searchParams.set('utm_medium', 'product_recommendation');
  url.searchParams.set('utm_campaign', 'race_products_v1');
  url.searchParams.set('utm_content', product.id);
  return url.toString();
}

// Rotate all categories across positions independently of the brand assignment.
export function orderProducts(products: RecommendedProduct[], visitorId: string): RecommendedProduct[] {
  if (products.length < 2) return products;
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) hash = (Math.imul(hash, 31) + visitorId.charCodeAt(i)) | 0;
  const offset = (hash >>> 0) % products.length;
  return [...products.slice(offset), ...products.slice(0, offset)];
}
