export type SponsorPage = 'homepage' | 'event_page';
export type SponsorBrand =
  | 'asics'
  | 'baouw'
  | 'inverse'
  | 'naak'
  | 'nutribay'
  | 'racepace';

export type SponsorCreativeVariant = 'control' | Exclude<SponsorBrand, 'asics'>;

export interface SponsorImage {
  src: string;
  width: number;
  height: number;
}

export interface SponsorBannerConfig {
  brand: SponsorBrand;
  creativeVariant: SponsorCreativeVariant;
  page: SponsorPage;
  destinationUrl: string;
  desktopImage: SponsorImage;
  mobileImage: SponsorImage;
  altKey: string;
}

const FEATURE_FLAG_VARIANT_TO_BRAND: Record<
  SponsorCreativeVariant,
  SponsorBrand
> = {
  control: 'asics',
  baouw: 'baouw',
  inverse: 'inverse',
  naak: 'naak',
  nutribay: 'nutribay',
  racepace: 'racepace',
};

const SPONSOR_DESTINATION_URLS: Record<SponsorBrand, string> = {
  asics: 'https://www.asics.com/es/es-es/trail-running-campaign/',
  baouw:
    'https://www.baouw-organic-nutrition.com/en_GB/shop/energy-purees-4/mix-30-energy-purees-bio-908',
  inverse: 'https://www.inverseteams.com/en/custom/custom-trail-running-wear/',
  naak: 'https://eu.naak.com/es-eu/products/boost-drink-mix-60-neutral-bag',
  nutribay: 'https://es.nutri-bay.com/',
  racepace: 'https://findracepace.com/',
};

const SPONSOR_IMAGES: Record<SponsorBrand, SponsorImage> = {
  asics: {
    src: '/assets/sponsors/asics-banner.png',
    width: 1800,
    height: 300,
  },
  baouw: {
    src: '/assets/sponsors/baouw-banner.png',
    width: 1800,
    height: 300,
  },
  inverse: {
    src: '/assets/sponsors/inverse-banner.png',
    width: 1800,
    height: 314,
  },
  naak: {
    src: '/assets/sponsors/naak-banner.png',
    width: 1800,
    height: 300,
  },
  nutribay: {
    src: '/assets/sponsors/nutribay-banner.png',
    width: 1800,
    height: 300,
  },
  racepace: {
    src: '/assets/sponsors/racepace-banner.png',
    width: 1800,
    height: 300,
  },
};

export function getSponsorBrand(
  posthogVariant: string | boolean | null | undefined,
): SponsorBrand | null {
  if (typeof posthogVariant !== 'string') return null;

  return FEATURE_FLAG_VARIANT_TO_BRAND[
    posthogVariant as SponsorCreativeVariant
  ] ?? null;
}

export function buildSponsorUrl(
  destinationUrl: string,
  page: SponsorPage,
): string {
  const url = new URL(destinationUrl);
  url.searchParams.set('utm_source', 'trailrunningcal');
  url.searchParams.set('utm_medium', 'banner');
  url.searchParams.set('utm_campaign', `${page}_image_banner`);
  return url.toString();
}

export function getSponsorBannerConfig({
  page,
  posthogVariant,
}: {
  page: SponsorPage;
  posthogVariant: string | boolean | null | undefined;
}): SponsorBannerConfig | null {
  const brand = getSponsorBrand(posthogVariant);
  if (!brand || typeof posthogVariant !== 'string') return null;

  const creativeVariant = posthogVariant as SponsorCreativeVariant;
  const image = SPONSOR_IMAGES[brand];

  return {
    brand,
    creativeVariant,
    page,
    destinationUrl: buildSponsorUrl(SPONSOR_DESTINATION_URLS[brand], page),
    desktopImage: image,
    mobileImage: image,
    altKey: `sponsors.${brand}.${page}.alt`,
  };
}
