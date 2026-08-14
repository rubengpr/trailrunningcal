import { describe, expect, it } from 'vitest';
import {
  buildSponsorUrl,
  getSponsorBannerConfig,
  getSponsorBannerType,
} from '@/lib/sponsors/banner-config';

describe('getSponsorBannerConfig', () => {
  it('returns no banner while there is no active sponsor', () => {
    const eventConfig = getSponsorBannerConfig({
      page: 'event_page',
      posthogVariant: 'control',
    });
    const homepageConfig = getSponsorBannerConfig({
      page: 'homepage',
      posthogVariant: 'sticky_banner',
    });

    expect(eventConfig).toBeNull();
    expect(homepageConfig).toBeNull();
  });
});

describe('getSponsorBannerType', () => {
  it('maps the feature flag variants to banner types', () => {
    expect(getSponsorBannerType('control')).toBe('image_banner');
    expect(getSponsorBannerType('sticky_banner')).toBe('sticky_banner');
  });

  it('returns null when the flag is unknown or disabled', () => {
    expect(getSponsorBannerType('unknown_variant')).toBeNull();
    expect(getSponsorBannerType(false)).toBeNull();
    expect(getSponsorBannerType(null)).toBeNull();
    expect(getSponsorBannerType(undefined)).toBeNull();
  });
});

describe('buildSponsorUrl', () => {
  it('tags the destination with the page and banner type', () => {
    const url = buildSponsorUrl(
      'https://otsosport.com/',
      'event_page',
      'sticky_banner',
    );

    expect(url).toContain('utm_source=trailrunningcal');
    expect(url).toContain('utm_medium=banner');
    expect(url).toContain('utm_campaign=event_page_sticky_banner');
  });

  it('preserves query params already on the destination', () => {
    const url = buildSponsorUrl(
      'https://salssa.com/discount/TRC15?redirect=/ca/products/perform',
      'homepage',
      'image_banner',
    );

    expect(url).toContain('redirect=%2Fca%2Fproducts%2Fperform');
    expect(url).toContain('utm_campaign=homepage_image_banner');
  });
});
