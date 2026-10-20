import { describe, expect, it } from 'vitest';
import { buildProductUrl, getDistanceBand, getPriceVariant, getProductRecommendations, getShoeVariant, getVariant, orderProducts } from '@/lib/sponsors/product-recommendation';

const ids = (distance: number, elevation: number | null, brand: 'naak' | 'baouw' = 'naak') => getProductRecommendations(distance, elevation, brand).filter(({ category }) => category !== 'shoes').map(({ id }) => id);

describe('product recommendations', () => {
  it('recognizes only the three price assignments', () => {
    expect(['control', 'show-price', 'show-discount', 'discount', true, undefined].map(getPriceVariant)).toEqual(['control', 'show-price', 'show-discount', null, null, null]);
  });
  it.each([[1, 'asics-fuji-lite-7'], [19.9, 'asics-fuji-lite-7'], [20, 'asics-trabuco-14'], [39.9, 'asics-trabuco-14'], [40, 'asics-metafuji-trail-2'], [49.9, 'asics-metafuji-trail-2'], [50, 'asics-trabuco-max-5'], [170, 'asics-trabuco-max-5']] as const)('selects ASICS footwear at %s km independently of nutrition', (distance, id) => {
    for (const nutrition of ['naak', 'baouw'] as const) {
      const products = getProductRecommendations(distance, 1800, nutrition, 'asics');
      expect(products.filter((product) => product.category === 'shoes').map((product) => product.id)).toEqual([id]);
      expect(products.filter((product) => product.category !== 'shoes')).toEqual(getProductRecommendations(distance, 1800, nutrition, 'kailas').filter((product) => product.category !== 'shoes'));
      expect(orderProducts(products, 'visitor-1').map((product) => product.category)).toEqual(orderProducts(getProductRecommendations(distance, 1800, nutrition, 'kailas'), 'visitor-1').map((product) => product.category));
    }
  });
  it('recognizes shoe assignments and preserves ASICS product URLs with UTMs', () => {
    for (const value of [undefined, false, true, 'kailas', 'unknown']) expect(getShoeVariant(value)).toBeNull();
    expect(getShoeVariant('control')).toBe('control');
    expect(getShoeVariant('asics')).toBe('asics');
    for (const distance of [11, 21, 42, 100]) {
      const product = getProductRecommendations(distance, null, 'naak', 'asics')[0];
      const url = new URL(buildProductUrl(product));
      expect(url.hostname).toBe('www.asics.com');
      expect(url.searchParams.get('utm_content')).toBe(product.id);
      expect(url.searchParams.get('utm_source')).toBe('trailrunningcal');
      expect(product.priceEur).toBeGreaterThan(0);
    }
  });
  it.each([[1, 'kailas-fuga-ex-3'], [19.9, 'kailas-fuga-ex-3'], [20, 'kailas-fuga-du-2'], [39.9, 'kailas-fuga-du-2'], [40, 'kailas-fuga-ex-pro'], [49.9, 'kailas-fuga-ex-pro'], [50, 'kailas-fuga-ex-330'], [170, 'kailas-fuga-ex-330']] as const)('selects %s km footwear independently of the nutrition brand', (distance, id) => {
    for (const brand of ['naak', 'baouw'] as const) {
      const shoes = getProductRecommendations(distance, null, brand).filter((product) => product.category === 'shoes');
      expect(shoes).toHaveLength(1);
      expect(shoes[0].id).toBe(id);
      expect(shoes[0].brand).toBe('Kailas FUGA');
    }
  });
  it('starts nutrition at 15 km and changes to ultra products at 50 km', () => {
    expect(ids(14.9, null)).toEqual([]);
    expect(ids(15, null)).toEqual(['naak-boost-gel']);
    expect(ids(49.9, null)).toEqual(['naak-boost-gel']);
    expect(ids(50, null)).toEqual(['naak-ultra-drink']);
    expect(ids(15, null, 'baouw')).toEqual(['baouw-gel']);
    expect(ids(49.9, null, 'baouw')).toEqual(['baouw-gel']);
    expect(ids(50, null, 'baouw')).toEqual(['baouw-puree']);
  });
  it('uses elevation and distance together for poles', () => {
    expect(ids(20, 1199)).not.toContain('leki-ultratrail');
    expect(ids(20, 1200)).toContain('leki-ultratrail');
    expect(ids(50, 1499)).not.toContain('leki-ultratrail');
    expect(ids(50, 1500)).toContain('leki-ultratrail');
    expect(ids(19.9, 2000)).not.toContain('leki-ultratrail');
    expect(ids(60, null)).toEqual(['naak-ultra-drink']);
  });
  it('allows poles for verticals only at the defined boundaries', () => {
    expect(ids(5, 500)).toEqual(['leki-ultratrail']);
    expect(ids(5, 499)).toEqual([]);
    expect(ids(8, 800)).toEqual(['leki-ultratrail']);
    expect(ids(8.1, 2000)).toEqual([]);
    expect(ids(8, 799)).toEqual([]);
  });
  it('handles invalid distance and elevation without inventing recommendations', () => {
    for (const distance of [0, -1, NaN, Infinity]) expect(ids(distance, 2000)).toEqual([]);
    for (const elevation of [-1, NaN, Infinity]) expect(ids(50, elevation)).toEqual(['naak-ultra-drink']);
  });
  it('builds distinct official product URLs with the agreed campaign tags', () => {
    const products = [...getProductRecommendations(30, 1800, 'naak'), ...getProductRecommendations(60, 1800, 'naak'), ...getProductRecommendations(30, null, 'baouw'), ...getProductRecommendations(60, null, 'baouw')];
    for (const product of products) {
      const url = new URL(buildProductUrl(product));
      expect(url.protocol).toBe('https:');
      expect(url.searchParams.get('utm_source')).toBe('trailrunningcal');
      expect(url.searchParams.get('utm_medium')).toBe('product_recommendation');
      expect(url.searchParams.get('utm_campaign')).toBe('race_products_v1');
      expect(url.searchParams.get('utm_content')).toBe(product.id);
      expect(product.image).toContain('/assets/sponsors/products/');
    }
  });
  it('recognizes only assigned experiment variants and keeps stable order', () => {
    for (const variant of [undefined, false, true, 'test', '']) expect(getVariant(variant)).toBeNull();
    expect(getVariant('control')).toBe('control');
    expect(getVariant('naak')).toBe('naak');
    expect(getVariant('baouw')).toBe('baouw');
    const products = getProductRecommendations(30, 1800, 'naak');
    expect(orderProducts(products, 'visitor-1')).toEqual(orderProducts(products, 'visitor-1'));
    expect(new Set(['visitor-1', 'visitor-2', 'visitor-3'].map((visitor) => orderProducts(products, visitor)[0].id)).size).toBe(3);
    expect(products[0].id).toBe('kailas-fuga-du-2');
    expect([19,20,39.9,40,49.9,50].map(getDistanceBand)).toEqual(['short','medium','medium','marathon','marathon','ultra']);
  });
});
