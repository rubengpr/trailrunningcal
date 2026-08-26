import { describe, expect, it } from 'vitest';
import { getSponsorPreviewConfig } from '@/lib/sponsors/preview-config';

describe('getSponsorPreviewConfig', () => {
  it('never enables previews outside development', () => {
    expect(
      getSponsorPreviewConfig({
        page: 'homepage',
        brand: 'naak',
        isDevelopment: false,
      }),
    ).toBeNull();
  });

  it('uses the brand key as the ignored local asset filename', () => {
    const config = getSponsorPreviewConfig({
      page: 'homepage',
      brand: 'naak',
      isDevelopment: true,
    });

    expect(config?.image.src).toBe(
      '/assets/sponsors/previews/naak-banner.png',
    );
    expect(config?.brand).toBe('Näak');
  });

  it('always tags preview destinations as image banners', () => {
    const config = getSponsorPreviewConfig({
      page: 'event_page',
      brand: 'naak',
      destinationUrl: 'https://naak.com',
      isDevelopment: true,
    });

    expect(config?.destinationUrl).toContain('utm_medium=banner_preview');
    expect(config?.destinationUrl).toContain(
      'utm_campaign=event_page_image_banner',
    );
  });
});
