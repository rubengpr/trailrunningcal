'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useFeatureFlagVariantKey } from 'posthog-js/react';
import { usePathname } from 'next/navigation';
import { PromoBanner, PromoTextStrip } from '@/components/home/promo-banner';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import {
  getSponsorBannerConfig,
  type SponsorBannerType,
  type SponsorBannerConfig,
  type SponsorPage,
} from '@/lib/sponsors/banner-config';
import { getSponsorPreviewConfig } from '@/lib/sponsors/preview-config';
import type { Locale } from '@/i18n';

interface SponsorBannerSlotProps {
  page: SponsorPage;
  locale: Locale;
  className?: string;
  bannerType?: SponsorBannerType;
}

const SPONSOR_BANNER_FLAG_KEY = 'sponsor-banner-format';

function getAnalyticsProperties(config: SponsorBannerConfig, locale: Locale) {
  return {
    brand: config.brand,
    page: config.page,
    banner_type: config.bannerType,
    locale,
    destination_url: config.destinationUrl,
  };
}

export function SponsorBannerSlot({
  page,
  locale,
  className,
  bannerType,
}: SponsorBannerSlotProps) {
  const tBanner = useTranslations('banner');
  const posthogVariant = useFeatureFlagVariantKey(SPONSOR_BANNER_FLAG_KEY);
  const impressionTrackedRef = useRef(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const previewConfig = useMemo(
    () =>
      getSponsorPreviewConfig({
        page,
        bannerType: bannerType ?? 'image_banner',
      }),
    [page, bannerType],
  );
  const config = useMemo(
    () => getSponsorBannerConfig({ page, posthogVariant }),
    [page, posthogVariant],
  );

  useEffect(() => {
    impressionTrackedRef.current = false;
  }, [config?.brand, config?.page, config?.bannerType]);

  useEffect(() => {
    if (previewConfig || !config || impressionTrackedRef.current) return;

    const bannerElement = bannerRef.current;
    if (!bannerElement) return;

    const trackImpression = () => {
      if (impressionTrackedRef.current) return;
      impressionTrackedRef.current = true;
      track(
        ANALYTICS_EVENTS.SPONSOR_BANNER_IMPRESSION,
        getAnalyticsProperties(config, locale),
      );
    };

    if (!('IntersectionObserver' in window)) {
      trackImpression();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        trackImpression();
        observer.disconnect();
      },
      { threshold: 0.5 },
    );

    observer.observe(bannerElement);

    return () => observer.disconnect();
  }, [config, locale, previewConfig]);

  const handleClick = useCallback(() => {
    if (!config) return;
    track(
      ANALYTICS_EVENTS.SPONSOR_BANNER_CLICKED,
      getAnalyticsProperties(config, locale),
    );
  }, [config, locale]);

  if (previewConfig) {
    return (
      <div>
        {previewConfig.bannerType === 'image_banner' ? (
          <PromoBanner
            alt={tBanner('preview.alt', { brand: previewConfig.brand })}
            className={className}
            desktopImage={previewConfig.image}
            mobileImage={previewConfig.image}
            href={previewConfig.destinationUrl}
            isVisible
          />
        ) : (
          <PromoTextStrip
            message={tBanner('preview.stickyMessage', {
              brand: previewConfig.brand,
            })}
            backgroundColor={previewConfig.stickyColor}
            code="TRC15"
            href={previewConfig.destinationUrl}
            isVisible
          />
        )}
      </div>
    );
  }

  if (!config) return null;
  if (bannerType && config.bannerType !== bannerType) return null;

  const alt = tBanner(config.altKey);

  return (
    <div ref={bannerRef}>
      {config.bannerType === 'image_banner' ? (
        <PromoBanner
          alt={alt}
          className={className}
          desktopImage={config.desktopImage}
          mobileImage={config.mobileImage}
          href={config.destinationUrl}
          onClick={handleClick}
          isVisible
        />
      ) : (
        <PromoTextStrip
          message={tBanner(config.stickyMessageKey)}
          backgroundColor={config.stickyColor}
          code={config.code}
          href={config.destinationUrl}
          onClick={handleClick}
          isVisible
        />
      )}
    </div>
  );
}

function getSponsorPageFromPathname(pathname: string, locale: Locale): SponsorPage | null {
  if (pathname === `/${locale}`) return 'homepage';
  if (pathname.startsWith(`/${locale}/e/`)) return 'event_page';
  return null;
}

export function SponsorStickyBannerSlot({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const page = getSponsorPageFromPathname(pathname, locale);

  if (!page) return null;

  return (
    <SponsorBannerSlot
      page={page}
      locale={locale}
      bannerType="sticky_banner"
    />
  );
}
