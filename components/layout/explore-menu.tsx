'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useExploreMenu } from '@/hooks/use-explore-menu';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { getTypePath } from '@/lib/races/race-types';
import {
  DESTINATION_PROVINCE_GROUPS,
  GEOGRAPHY,
  getDestinationPath,
} from '@/lib/geography/destinations';
import type { Locale } from '@/i18n';

interface ExploreMenuProps {
  locale: Locale;
}

const typeLinks = [
  { slug: 'ultra-trail', labelKey: 'ultraTrail', eventText: 'ultra_trail' },
  { slug: 'maraton', labelKey: 'maraton', eventText: 'maraton' },
  { slug: 'media-maraton', labelKey: 'mediaMaraton', eventText: 'media_maraton' },
  { slug: 'marcha', labelKey: 'marcha', eventText: 'marcha' },
  { slug: 'km-vertical', labelKey: 'kmVertical', eventText: 'km_vertical' },
  { slug: 'backyard', labelKey: 'backyard', eventText: 'backyard' },
] as const;

export function ExploreMenu({ locale }: ExploreMenuProps) {
  const t = useTranslations('navigation');
  const tProvince = useTranslations('provincia.names');
  const tGeography = useTranslations('geography.regions');
  const { isOpen, containerRef, close, toggle } = useExploreMenu();

  const handleNavigate = (text: string, href: string) => {
    close();
    setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, {
      link_text: text,
      link_href: href,
      locale,
    }), 0);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-gray-900 transition-colors cursor-pointer"
        onClick={toggle}
      >
        {t('explore')}
        <ChevronDown size={16} />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[320px] p-3 flex gap-6">
          <div className="flex-1">
            <p className="px-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('categoriesHeading')}</p>
            {typeLinks.map(({ slug, labelKey, eventText }) => {
              const href = getTypePath(locale, slug);
              return (
                <Link
                  key={slug}
                  href={href}
                  prefetch={false}
                  className="block cursor-pointer px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors"
                  onClick={() => handleNavigate(eventText, href)}
                >
                  {t(labelKey)}
                </Link>
              );
            })}
          </div>
          <div className="w-px bg-gray-100" />
          <div className="flex-1 max-h-[min(28rem,calc(100vh-7rem))] overflow-y-auto">
            <p className="px-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('provincesHeading')}</p>
            {DESTINATION_PROVINCE_GROUPS.map(({ regionId, provinceIds }) => (
              <section key={regionId} className="mb-2 last:mb-0">
                <p className="px-2 pt-2 pb-1 text-xs font-semibold text-gray-500">{tGeography(regionId)}</p>
                {provinceIds.map((provinceId) => {
                  const province = GEOGRAPHY.provinces[provinceId];
                  const href = getDestinationPath(locale, province.regionId, provinceId);

                  return (
                    <Link
                      key={provinceId}
                      href={href}
                      prefetch={false}
                      className="block cursor-pointer px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors"
                      onClick={() => handleNavigate(provinceId, href)}
                    >
                      {tProvince(provinceId)}
                    </Link>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
