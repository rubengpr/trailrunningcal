'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { PromoBanner } from '@/components/home/promo-banner';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import {
  getSponsorBannerConfig,
  type SponsorBannerConfig,
  type SponsorPage,
} from '@/lib/sponsors/banner-config';
import { getSponsorPreviewConfig } from '@/lib/sponsors/preview-config';
import { useFeatureFlagVariant } from '@/hooks/use-feature-flag-variant';
import type { Locale } from '@/i18n';

interface SponsorBannerSlotProps {
  page: SponsorPage;
  locale: Locale;
  className?: string;
}

const SPONSOR_BANNER_FLAG_KEY = 'sponsor-banner-creative';

function getAnalyticsProperties(config: SponsorBannerConfig, locale: Locale) {
  return {
    brand: config.brand,
    creative_variant: config.creativeVariant,
    page: config.page,
    banner_type: 'image_banner' as const,
    locale,
    destination_url: config.destinationUrl,
  };
}

export function SponsorBannerSlot({
  page,
  locale,
  className,
}: SponsorBannerSlotProps) {
  const tBanner = useTranslations('banner');
  const flagVariant = useFeatureFlagVariant(SPONSOR_BANNER_FLAG_KEY);
  const impressionTrackedRef = useRef(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const previewConfig = useMemo(
    () =>
      getSponsorPreviewConfig({
        page,
      }),
    [page],
  );
  const config = useMemo(
    () => getSponsorBannerConfig({ page, posthogVariant: flagVariant }),
    [page, flagVariant],
  );

  useEffect(() => {
    impressionTrackedRef.current = false;
  }, [config?.brand, config?.creativeVariant, config?.page]);

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
      <PromoBanner
        alt={tBanner('preview.alt', { brand: previewConfig.brand })}
        className={className}
        desktopImage={previewConfig.image}
        mobileImage={previewConfig.image}
        href={previewConfig.destinationUrl}
        isVisible
      />
    );
  }

  if (!config) return null;

  const alt = tBanner(config.altKey);

  return (
    <div ref={bannerRef}>
      <PromoBanner
        alt={alt}
        className={className}
        desktopImage={config.desktopImage}
        mobileImage={config.mobileImage}
        href={config.destinationUrl}
        onClick={handleClick}
        isVisible
      />
    </div>
  );
}
