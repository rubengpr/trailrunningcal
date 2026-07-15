import { describe, expect, it } from 'vitest';
import { getSponsorPreviewConfig } from '@/lib/sponsors/preview-config';

describe('getSponsorPreviewConfig', () => {
  it('never enables previews outside development', () => {
    expect(
      getSponsorPreviewConfig({
        page: 'homepage',
        bannerType: 'image_banner',
        brand: 'naak',
        isDevelopment: false,
      }),
    ).toBeNull();
  });

  it('uses the brand key as the ignored local asset filename', () => {
    const config = getSponsorPreviewConfig({
      page: 'homepage',
      bannerType: 'image_banner',
      brand: 'naak',
      format: 'both',
      isDevelopment: true,
    });

    expect(config?.image.src).toBe(
      '/assets/sponsors/previews/naak-banner.png',
    );
    expect(config?.brand).toBe('Näak');
  });

  it('can show image and sticky formats at the same time', () => {
    const imageConfig = getSponsorPreviewConfig({
      page: 'event_page',
      bannerType: 'image_banner',
      brand: 'naak',
      format: 'both',
      isDevelopment: true,
    });
    const stickyConfig = getSponsorPreviewConfig({
      page: 'event_page',
      bannerType: 'sticky_banner',
      brand: 'naak',
      format: 'both',
      isDevelopment: true,
    });

    expect(imageConfig?.bannerType).toBe('image_banner');
    expect(stickyConfig?.bannerType).toBe('sticky_banner');
  });
});
