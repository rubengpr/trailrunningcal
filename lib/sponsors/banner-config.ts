export type SponsorPage = 'homepage' | 'event_page';
export type SponsorBannerType = 'image_banner' | 'sticky_banner';
export type SponsorBrand = 'salssa' | 'otso' | 'asics';

export interface SponsorImage {
  src: string;
  width: number;
  height: number;
}

export interface SponsorBannerConfig {
  brand: SponsorBrand;
  page: SponsorPage;
  bannerType: SponsorBannerType;
  destinationUrl: string;
  desktopImage: SponsorImage;
  mobileImage: SponsorImage;
  altKey: string;
  stickyMessageKey: string;
  stickyColor: string;
  code?: string;
}

const FEATURE_FLAG_VARIANT_TO_BANNER_TYPE: Record<string, SponsorBannerType> = {
  control: 'image_banner',
  sticky_banner: 'sticky_banner',
};

// Manual rollout switch. Set a page to a sponsor brand and redeploy to activate it.
const ACTIVE_SPONSOR_BY_PAGE: Record<SponsorPage, SponsorBrand | null> = {
  homepage: 'salssa',
  event_page: 'otso',
};

const SPONSOR_DESTINATION_URLS: Record<SponsorBrand, string> = {
  salssa: 'https://salssa.com/discount/TRC15?redirect=/ca/products/perform',
  otso: 'https://otsosport.com/',
  asics: 'https://www.asics.com/es/es-es/metafuji-campaign/',
};

const SPONSOR_CODES: Partial<Record<SponsorBrand, string>> = {
  salssa: 'TRC15',
  otso: 'TRC25',
};

const SPONSOR_STICKY_COLORS: Record<SponsorBrand, string> = {
  salssa: '#812b33',
  otso: '#FF4713',
  asics: '#001e62',
};

const SPONSOR_IMAGES: Record<
  SponsorBrand,
  Record<
    SponsorPage,
    {
      desktop: SponsorImage;
      mobile: SponsorImage;
    }
  >
> = {
  salssa: {
    homepage: {
      desktop: {
        src: '/assets/sponsors/salssa-homepage-desktop.webp',
        width: 5625,
        height: 938,
      },
      mobile: {
        src: '/assets/sponsors/salssa-homepage-mobile.webp',
        width: 2813,
        height: 350,
      },
    },
    event_page: {
      desktop: {
        src: '/assets/sponsors/salssa-event-desktop.webp',
        width: 5625,
        height: 703,
      },
      mobile: {
        src: '/assets/sponsors/salssa-event-mobile.webp',
        width: 2813,
        height: 469,
      },
    },
  },
  otso: {
    homepage: {
      desktop: {
        src: '/assets/sponsors/otso-homepage-desktop.jpg',
        width: 1800,
        height: 300,
      },
      mobile: {
        src: '/assets/sponsors/otso-homepage-mobile.jpg',
        width: 900,
        height: 150,
      },
    },
    event_page: {
      desktop: {
        src: '/assets/sponsors/otso-event-desktop.jpg',
        width: 1800,
        height: 225,
      },
      mobile: {
        src: '/assets/sponsors/otso-event-mobile.jpg',
        width: 900,
        height: 112,
      },
    },
  },
  asics: {
    homepage: {
      desktop: {
        src: '/assets/sponsors/asics.png',
        width: 1800,
        height: 300,
      },
      mobile: {
        src: '/assets/sponsors/asics.png',
        width: 1800,
        height: 300,
      },
    },
    event_page: {
      desktop: {
        src: '/assets/sponsors/asics.png',
        width: 1800,
        height: 300,
      },
      mobile: {
        src: '/assets/sponsors/asics.png',
        width: 1800,
        height: 300,
      },
    },
  },
};

export function getSponsorBannerType(
  posthogVariant: string | boolean | null | undefined,
): SponsorBannerType | null {
  if (typeof posthogVariant !== 'string') return null;
  return FEATURE_FLAG_VARIANT_TO_BANNER_TYPE[posthogVariant] ?? null;
}

export function buildSponsorUrl(
  destinationUrl: string,
  page: SponsorPage,
  bannerType: SponsorBannerType,
): string {
  const url = new URL(destinationUrl);
  url.searchParams.set('utm_source', 'trailrunningcal');
  url.searchParams.set('utm_medium', 'banner');
  url.searchParams.set('utm_campaign', `${page}_${bannerType}`);
  return url.toString();
}

export function getSponsorBannerConfig({
  page,
  posthogVariant,
}: {
  page: SponsorPage;
  posthogVariant: string | boolean | null | undefined;
}): SponsorBannerConfig | null {
  const brand = ACTIVE_SPONSOR_BY_PAGE[page];
  const bannerType = getSponsorBannerType(posthogVariant);

  if (!brand || !bannerType) return null;

  const images = SPONSOR_IMAGES[brand][page];

  return {
    brand,
    page,
    bannerType,
    destinationUrl: buildSponsorUrl(
      SPONSOR_DESTINATION_URLS[brand],
      page,
      bannerType,
    ),
    desktopImage: images.desktop,
    mobileImage: images.mobile,
    altKey: `sponsors.${brand}.${page}.alt`,
    stickyMessageKey: `sponsors.${brand}.stickyMessage`,
    stickyColor: SPONSOR_STICKY_COLORS[brand],
    code: SPONSOR_CODES[brand],
  };
}
