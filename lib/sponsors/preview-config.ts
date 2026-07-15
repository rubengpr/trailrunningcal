import type {
  SponsorBannerType,
  SponsorImage,
  SponsorPage,
} from '@/lib/sponsors/banner-config';

export type SponsorPreviewFormat = SponsorBannerType | 'both';

export interface SponsorPreviewConfig {
  bannerType: SponsorBannerType;
  brand: string;
  destinationUrl?: string;
  image: SponsorImage;
  stickyColor: string;
}

interface SponsorPreviewOptions {
  bannerType: SponsorBannerType;
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
  bannerType: SponsorBannerType,
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
  if (value === 'sticky_banner' || value === 'both') return value;
  return 'image_banner';
}

export function getSponsorPreviewConfig({
  bannerType,
  page,
  brand = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_BRAND,
  destinationUrl = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_URL,
  format = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_FORMAT,
  isDevelopment = process.env.NODE_ENV === 'development',
  stickyColor = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_COLOR,
}: SponsorPreviewOptions): SponsorPreviewConfig | null {
  if (!isDevelopment || !brand) return null;

  const brandKey = brand.trim().toLowerCase();
  if (!BRAND_KEY_PATTERN.test(brandKey)) return null;

  const previewFormat = getFormat(format);
  if (previewFormat !== 'both' && previewFormat !== bannerType) return null;

  return {
    bannerType,
    brand: getBrandLabel(brandKey),
    destinationUrl: buildDestinationUrl(destinationUrl, page, bannerType),
    image: {
      src: `/assets/sponsors/previews/${brandKey}-banner.png`,
      width: 1800,
      height: 300,
    },
    stickyColor: stickyColor || '#000000',
  };
}
