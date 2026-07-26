import { describe, expect, it } from 'vitest';
import { getSponsorBannerConfig } from '@/lib/sponsors/banner-config';

describe('getSponsorBannerConfig', () => {
  it('assigns Salssa to event pages and Otso to the homepage', () => {
    const eventConfig = getSponsorBannerConfig({
      page: 'event_page',
      posthogVariant: 'control',
    });
    const homepageConfig = getSponsorBannerConfig({
      page: 'homepage',
      posthogVariant: 'control',
    });

    expect(eventConfig).toMatchObject({
      brand: 'salssa',
      bannerType: 'image_banner',
      page: 'event_page',
    });
    expect(homepageConfig).toMatchObject({
      brand: 'otso',
      bannerType: 'image_banner',
      page: 'homepage',
    });
  });

  it('builds the Salssa sticky banner destination for event pages', () => {
    const config = getSponsorBannerConfig({
      page: 'event_page',
      posthogVariant: 'sticky_banner',
    });

    expect(config).toMatchObject({
      brand: 'salssa',
      bannerType: 'sticky_banner',
      code: 'TRC15',
    });
    expect(config?.destinationUrl).toContain(
      'utm_campaign=event_page_sticky_banner',
    );
  });
});
