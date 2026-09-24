export type SponsorPage = 'homepage' | 'event_page';
export type SponsorBrand =
  | 'asics'
  | 'baouw'
  | 'inverse'
  | 'naak'
  | 'nutribay'
  | 'racepace';

export type SponsorCreativeVariant =
  | 'control'
  | 'baouw'
  | 'baouw-descuento'
  | 'baouw-tienda'
  | 'inverse'
  | 'naak'
  | 'nutribay'
  | 'racepace';

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

interface SponsorCreative {
  brand: SponsorBrand;
  destinationUrl: string;
  image: SponsorImage;
  altKey: string;
}

const image = (src: string, height = 300): SponsorImage => ({
  src,
  width: 1800,
  height,
});

const SPONSOR_CREATIVES: Record<SponsorCreativeVariant, SponsorCreative> = {
  control: {
    brand: 'asics',
    destinationUrl: 'https://www.asics.com/es/es-es/trail-running-campaign/',
    image: image('/assets/sponsors/asics-banner.png'),
    altKey: 'sponsors.asics',
  },
  // Keep the legacy key until the new Baouw variants are serving traffic.
  baouw: {
    brand: 'baouw',
    destinationUrl:
      'https://www.baouw-organic-nutrition.com/en_GB/shop/energy-purees-4/mix-30-energy-purees-bio-908',
    image: image('/assets/sponsors/baouw-banner.png'),
    altKey: 'sponsors.baouw',
  },
  'baouw-descuento': {
    brand: 'baouw',
    destinationUrl:
      'https://www.baouw-organic-nutrition.com/es/shop/category/buenas-ofertas-3',
    image: image('/assets/sponsors/baouw-descuento.png'),
    altKey: 'sponsors.baouw.discount',
  },
  'baouw-tienda': {
    brand: 'baouw',
    destinationUrl: 'https://www.baouw-organic-nutrition.com',
    image: image('/assets/sponsors/baouw-tienda.png'),
    altKey: 'sponsors.baouw.store',
  },
  inverse: {
    brand: 'inverse',
    destinationUrl: 'https://www.inverseteams.com/en/custom/custom-trail-running-wear/',
    image: image('/assets/sponsors/inverse-banner.png', 314),
    altKey: 'sponsors.inverse',
  },
  naak: {
    brand: 'naak',
    destinationUrl: 'https://eu.naak.com/es-eu/products/boost-drink-mix-60-neutral-bag',
    image: image('/assets/sponsors/naak-banner.png'),
    altKey: 'sponsors.naak',
  },
  nutribay: {
    brand: 'nutribay',
    destinationUrl: 'https://es.nutri-bay.com/',
    image: image('/assets/sponsors/nutribay-banner.png'),
    altKey: 'sponsors.nutribay',
  },
  racepace: {
    brand: 'racepace',
    destinationUrl: 'https://findracepace.com/',
    image: image('/assets/sponsors/racepace-banner.png'),
    altKey: 'sponsors.racepace',
  },
};

export function getSponsorBrand(
  posthogVariant: string | boolean | null | undefined,
): SponsorBrand | null {
  if (typeof posthogVariant !== 'string') return null;

  return (
    SPONSOR_CREATIVES[posthogVariant as SponsorCreativeVariant]?.brand ?? null
  );
}

export function buildSponsorUrl(
  destinationUrl: string,
  page: SponsorPage,
  creativeVariant: SponsorCreativeVariant,
): string {
  const url = new URL(destinationUrl);
  url.searchParams.set('utm_source', 'trailrunningcal');
  url.searchParams.set('utm_medium', 'banner');
  url.searchParams.set('utm_campaign', `${page}_image_banner`);
  url.searchParams.set('utm_content', creativeVariant);
  return url.toString();
}

export function getSponsorBannerConfig({
  page,
  posthogVariant,
}: {
  page: SponsorPage;
  posthogVariant: string | boolean | null | undefined;
}): SponsorBannerConfig | null {
  if (typeof posthogVariant !== 'string') return null;

  const creativeVariant = posthogVariant as SponsorCreativeVariant;
  const creative = SPONSOR_CREATIVES[creativeVariant];
  if (!creative) return null;

  return {
    brand: creative.brand,
    creativeVariant,
    page,
    destinationUrl: buildSponsorUrl(
      creative.destinationUrl,
      page,
      creativeVariant,
    ),
    desktopImage: creative.image,
    mobileImage: creative.image,
    altKey: `${creative.altKey}.${page}.alt`,
  };
}
