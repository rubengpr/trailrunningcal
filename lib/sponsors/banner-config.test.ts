import { describe, expect, it } from 'vitest';
import { getSponsorBannerConfig } from '@/lib/sponsors/banner-config';

describe('getSponsorBannerConfig', () => {
  it('uses ASICS only on event pages', () => {
    const eventConfig = getSponsorBannerConfig({
      page: 'event_page',
      posthogVariant: 'control',
    });
    const homepageConfig = getSponsorBannerConfig({
      page: 'homepage',
      posthogVariant: 'control',
    });

    expect(eventConfig).toMatchObject({
      brand: 'asics',
      bannerType: 'image_banner',
      page: 'event_page',
    });
    expect(homepageConfig?.brand).toBe('salssa');
  });

  it('builds the ASICS sticky banner destination', () => {
    const config = getSponsorBannerConfig({
      page: 'event_page',
      posthogVariant: 'sticky_banner',
    });

    expect(config).toMatchObject({
      brand: 'asics',
      bannerType: 'sticky_banner',
      code: undefined,
    });
    expect(config?.destinationUrl).toContain(
      'utm_campaign=event_page_sticky_banner',
    );
  });
});
