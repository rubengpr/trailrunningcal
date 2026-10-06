import type {
  SponsorImage,
  SponsorPage,
} from '@/lib/sponsors/banner-config';

export interface SponsorPreviewConfig {
  brand: string;
  brandKey: string;
  code?: string;
  destinationUrl?: string;
  image: SponsorImage;
  stickyColor: string;
  stickyMessageKey?: string;
}

export type SponsorPreviewBannerType = 'image_banner' | 'sticky_banner';
export type SponsorPreviewFormat = 'image' | 'sticky' | 'both';

interface SponsorPreviewOptions {
  bannerType?: SponsorPreviewBannerType;
  page: SponsorPage;
  brand?: string;
  destinationUrl?: string;
  format?: string;
  isDevelopment?: boolean;
  stickyColor?: string;
}

const BRAND_KEY_PATTERN = /^[a-z0-9-]+$/;
const BRAND_LABELS: Record<string, string> = {
  naak: 'Näak',
};

function getBrandLabel(brandKey: string): string {
  const label = BRAND_LABELS[brandKey];
  if (label) return label;

  return brandKey
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildDestinationUrl(
  destinationUrl: string | undefined,
  page: SponsorPage,
  bannerType: SponsorPreviewBannerType,
): string | undefined {
  if (!destinationUrl) return undefined;

  try {
    const url = new URL(destinationUrl);
    url.searchParams.set('utm_source', 'trailrunningcal');
    url.searchParams.set('utm_medium', 'banner_preview');
    url.searchParams.set('utm_campaign', `${page}_${bannerType}`);
    return url.toString();
  } catch {
    return undefined;
  }
}

function getFormat(value: string | undefined): SponsorPreviewFormat {
  if (value === 'sticky' || value === 'both') return value;
  return 'image';
}

function isFormatVisible(
  format: SponsorPreviewFormat,
  bannerType: SponsorPreviewBannerType,
) {
  return format === 'both' || (format === 'image' && bannerType === 'image_banner') ||
    (format === 'sticky' && bannerType === 'sticky_banner');
}

export function isSponsorPreviewEnabled({
  brand = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_BRAND,
  isDevelopment = process.env.NODE_ENV === 'development',
}: Pick<SponsorPreviewOptions, 'brand' | 'isDevelopment'> = {}) {
  return Boolean(isDevelopment && brand && BRAND_KEY_PATTERN.test(brand.trim().toLowerCase()));
}

export function getSponsorPreviewConfig({
  bannerType = 'image_banner',
  page,
  brand = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_BRAND,
  destinationUrl = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_URL,
  format = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_FORMAT,
  isDevelopment = process.env.NODE_ENV === 'development',
  stickyColor = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_COLOR,
}: SponsorPreviewOptions): SponsorPreviewConfig | null {
  if (!isSponsorPreviewEnabled({ brand, isDevelopment }) || !brand) return null;

  const brandKey = brand.trim().toLowerCase();
  if (!isFormatVisible(getFormat(format), bannerType)) return null;

  const isTrailBrandSticky = bannerType === 'sticky_banner' && brandKey === 'trail-brand';
  if (bannerType === 'sticky_banner' && !isTrailBrandSticky) return null;

  return {
    brand: getBrandLabel(brandKey),
    brandKey,
    ...(isTrailBrandSticky ? { code: 'TRC15', stickyMessageKey: 'preview.trailBrand.stickyMessage' } : {}),
    destinationUrl: buildDestinationUrl(destinationUrl, page, bannerType),
    image: {
      src: `/assets/sponsors/previews/${brandKey}-banner.png`,
      width: 1800,
      height: 300,
    },
    stickyColor: stickyColor || '#000000',
  };
}
