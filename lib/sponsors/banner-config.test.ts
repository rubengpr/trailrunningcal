import { describe, expect, it } from 'vitest';
import {
  buildSponsorUrl,
  getSponsorBannerConfig,
  getSponsorBrand,
} from '@/lib/sponsors/banner-config';

describe('getSponsorBannerConfig', () => {
  it.each([
    ['control', 'asics', 'asics-banner.png'],
    ['baouw', 'baouw', 'baouw-banner.png'],
    ['baouw-descuento', 'baouw', 'baouw-descuento.png'],
    ['baouw-tienda', 'baouw', 'baouw-tienda.png'],
    ['inverse', 'inverse', 'inverse-banner.png'],
    ['naak', 'naak', 'naak-banner.png'],
    ['nutribay', 'nutribay', 'nutribay-banner.png'],
    ['racepace', 'racepace', 'racepace-banner.png'],
  ] as const)('maps %s to the %s creative', (variant, brand, filename) => {
    const config = getSponsorBannerConfig({
      page: 'homepage',
      posthogVariant: variant,
    });

    expect(config).toMatchObject({
      brand,
      creativeVariant: variant,
      page: 'homepage',
      desktopImage: {
        src: `/assets/sponsors/${filename}`,
      },
      mobileImage: {
        src: `/assets/sponsors/${filename}`,
      },
    });
  });

  it('uses the same creative on event pages', () => {
    const config = getSponsorBannerConfig({
      page: 'event_page',
      posthogVariant: 'naak',
    });

    expect(config).toMatchObject({
      brand: 'naak',
      creativeVariant: 'naak',
      page: 'event_page',
      desktopImage: {
        src: '/assets/sponsors/naak-banner.png',
      },
    });
  });

  it('returns no banner when the flag is unavailable or unknown', () => {
    expect(getSponsorBannerConfig({ page: 'homepage', posthogVariant: false })).toBeNull();
    expect(getSponsorBannerConfig({ page: 'homepage', posthogVariant: null })).toBeNull();
    expect(getSponsorBannerConfig({ page: 'homepage', posthogVariant: undefined })).toBeNull();
    expect(
      getSponsorBannerConfig({
        page: 'homepage',
        posthogVariant: 'sticky_banner',
      }),
    ).toBeNull();
  });
});

describe('getSponsorBrand', () => {
  it('only accepts the configured creative variants', () => {
    expect(getSponsorBrand('control')).toBe('asics');
    expect(getSponsorBrand('baouw')).toBe('baouw');
    expect(getSponsorBrand('baouw-descuento')).toBe('baouw');
    expect(getSponsorBrand('baouw-tienda')).toBe('baouw');
    expect(getSponsorBrand('sticky_banner')).toBeNull();
  });
});

describe('buildSponsorUrl', () => {
  it('tags the destination with the page and image banner format', () => {
    const url = buildSponsorUrl(
      'https://findracepace.com/',
      'event_page',
      'racepace',
    );

    expect(url).toContain('utm_source=trailrunningcal');
    expect(url).toContain('utm_medium=banner');
    expect(url).toContain('utm_campaign=event_page_image_banner');
    expect(url).toContain('utm_content=racepace');
  });

  it('preserves query params already on the destination', () => {
    const url = buildSponsorUrl(
      'https://example.com/?campaign=summer',
      'homepage',
      'baouw-tienda',
    );

    expect(url).toContain('campaign=summer');
    expect(url).toContain('utm_campaign=homepage_image_banner');
    expect(url).toContain('utm_content=baouw-tienda');
  });

  it('uses each Baouw creative destination', () => {
    const discount = getSponsorBannerConfig({
      page: 'homepage',
      posthogVariant: 'baouw-descuento',
    });
    const store = getSponsorBannerConfig({
      page: 'homepage',
      posthogVariant: 'baouw-tienda',
    });

    expect(discount?.destinationUrl).toContain(
      '/es/shop/category/buenas-ofertas-3',
    );
    expect(store?.destinationUrl).toContain('www.baouw-organic-nutrition.com/?');
  });
});
