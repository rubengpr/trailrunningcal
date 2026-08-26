import type {
  SponsorImage,
  SponsorPage,
} from '@/lib/sponsors/banner-config';

export interface SponsorPreviewConfig {
  brand: string;
  destinationUrl?: string;
  image: SponsorImage;
}

interface SponsorPreviewOptions {
  page: SponsorPage;
  brand?: string;
  destinationUrl?: string;
  isDevelopment?: boolean;
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
): string | undefined {
  if (!destinationUrl) return undefined;

  try {
    const url = new URL(destinationUrl);
    url.searchParams.set('utm_source', 'trailrunningcal');
    url.searchParams.set('utm_medium', 'banner_preview');
    url.searchParams.set('utm_campaign', `${page}_image_banner`);
    return url.toString();
  } catch {
    return undefined;
  }
}

export function getSponsorPreviewConfig({
  page,
  brand = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_BRAND,
  destinationUrl = process.env.NEXT_PUBLIC_SPONSOR_PREVIEW_URL,
  isDevelopment = process.env.NODE_ENV === 'development',
}: SponsorPreviewOptions): SponsorPreviewConfig | null {
  if (!isDevelopment || !brand) return null;

  const brandKey = brand.trim().toLowerCase();
  if (!BRAND_KEY_PATTERN.test(brandKey)) return null;

  return {
    brand: getBrandLabel(brandKey),
    destinationUrl: buildDestinationUrl(destinationUrl, page),
    image: {
      src: `/assets/sponsors/previews/${brandKey}-banner.png`,
      width: 1800,
      height: 300,
    },
  };
}
