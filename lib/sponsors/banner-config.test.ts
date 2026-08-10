import { describe, expect, it } from 'vitest';
import { getSponsorBannerConfig } from '@/lib/sponsors/banner-config';

describe('getSponsorBannerConfig', () => {
  it('assigns Otso to event pages and leaves the homepage empty', () => {
    const eventConfig = getSponsorBannerConfig({
      page: 'event_page',
      posthogVariant: 'control',
    });
    const homepageConfig = getSponsorBannerConfig({
      page: 'homepage',
      posthogVariant: 'control',
    });

    expect(eventConfig).toMatchObject({
      brand: 'otso',
      bannerType: 'image_banner',
      page: 'event_page',
    });
    expect(homepageConfig).toBeNull();
  });

  it('builds the Otso sticky banner destination for event pages', () => {
    const config = getSponsorBannerConfig({
      page: 'event_page',
      posthogVariant: 'sticky_banner',
    });

    expect(config).toMatchObject({
      brand: 'otso',
      bannerType: 'sticky_banner',
      code: 'TRC25',
    });
    expect(config?.destinationUrl).toContain(
      'utm_campaign=event_page_sticky_banner',
    );
  });
});
