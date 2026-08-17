'use client';

import { useEffect, useRef, useState } from 'react';
import { Award } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n';
import type { PublicEventDetail } from '@/types/event.types';
import { formatEventLocationLabel } from '@/lib/events/utils';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { useCardImpression } from '@/hooks/use-card-impression';
import { DistanceBadge } from '@/components/race/distance-badge';

interface EventCardProps {
  eventDetail: PublicEventDetail;
  locale: Locale;
  isFeatured?: boolean;
  analyticsContext?: {
    source: 'calendar_explorer';
    pageType: 'homepage' | 'finder_type' | 'finder_province_distance';
    listPosition: number;
    layoutToggleVariant?: 'control' | 'icon_text';
  };
}

function formatDateBlock(dateString: string | null, locale: Locale) {
  if (!dateString) {
    return {
      day: '-',
      month: '-',
      weekday: '-',
    };
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dateLocale = locale === 'ca' ? 'ca-ES' : 'es-ES';

  return {
    day: new Intl.DateTimeFormat(dateLocale, { day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat(dateLocale, { month: 'short' })
      .format(date)
      .replace('.', ''),
    weekday: new Intl.DateTimeFormat(dateLocale, { weekday: 'short' })
      .format(date)
      .replace('.', ''),
  };
}

export function EventCard({
  eventDetail,
  locale,
  isFeatured = false,
  analyticsContext,
}: EventCardProps) {
  const tFeatured = useTranslations('event.featured');
  const tDescriptions = useTranslations('featuredEvents');
  const [shinePos, setShinePos] = useState({ x: 0, y: 0 });
  const [shinePercent, setShinePercent] = useState(50);
  const [shineActive, setShineActive] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const shineTargetRef = useRef(50);
  const shineStartRef = useRef(50);
  const shineStartTimeRef = useRef(0);
  const shineAnimationRef = useRef<number | null>(null);
  const { day, month, weekday } = formatDateBlock(eventDetail.dateRange.startDate, locale);
  const location = formatEventLocationLabel(eventDetail.location, locale);
  const impressionRef = useCardImpression<HTMLElement>({
    pageType: analyticsContext?.pageType,
    eventId: eventDetail.event.id,
    eventSlug: eventDetail.event.slug,
    listPosition: analyticsContext?.listPosition,
  });
  const handleClick = analyticsContext
    ? () => {
      track(ANALYTICS_EVENTS.RACE_CARD_CLICKED, {
        event_id: eventDetail.event.id,
        event_slug: eventDetail.event.slug,
        source: analyticsContext.source,
        list_position: analyticsContext.listPosition,
        ...(analyticsContext.layoutToggleVariant
          ? { layout_toggle_variant: analyticsContext.layoutToggleVariant }
          : {}),
      });
    }
    : undefined;
  const maxTiltX = 6;
  const maxTiltY = 2;
  const shineDurationMs = 500;
  const animateShinePercent = (now: number) => {
    const elapsed = now - shineStartTimeRef.current;
    const t = Math.min(1, elapsed / shineDurationMs);
    const eased = 1 - (1 - t) * (1 - t) * (1 - t);
    const next = shineStartRef.current + (shineTargetRef.current - shineStartRef.current) * eased;
    setShinePercent(next);
    if (t < 1) {
      shineAnimationRef.current = requestAnimationFrame(animateShinePercent);
    } else {
      shineAnimationRef.current = null;
    }
  };
  const startShineAnimation = (target: number) => {
    if (shineAnimationRef.current != null) cancelAnimationFrame(shineAnimationRef.current);
    shineStartRef.current = shinePercent;
    shineTargetRef.current = target;
    shineStartTimeRef.current = performance.now();
    shineAnimationRef.current = requestAnimationFrame(animateShinePercent);
  };
  useEffect(() => () => {
    if (shineAnimationRef.current != null) cancelAnimationFrame(shineAnimationRef.current);
  }, []);
  const handleShineMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setShinePos({ x, y });
    if (shineAnimationRef.current != null) {
      cancelAnimationFrame(shineAnimationRef.current);
      shineAnimationRef.current = null;
    }
    setShinePercent(((x / rect.width + y / rect.height) / 2) * 100);
    setTilt({
      rx: -((y / rect.height - 0.5) * maxTiltX * 2),
      ry: (x / rect.width - 0.5) * maxTiltY * 2,
    });
  };
  const handleShineEnter = () => {
    if (window.matchMedia('(hover: hover)').matches) setShineActive(true);
  };
  const handleShineLeave = () => {
    setShineActive(false);
    setTilt({ rx: 0, ry: 0 });
    startShineAnimation(50);
  };

  return (
    <article
      ref={impressionRef}
      onMouseMove={isFeatured ? handleShineMove : undefined}
      onMouseEnter={isFeatured ? handleShineEnter : undefined}
      onMouseLeave={isFeatured ? handleShineLeave : undefined}
      className={`relative w-full min-w-0 max-w-full overflow-hidden rounded-lg shadow transition-[box-shadow] duration-[500ms] ${
        isFeatured ? '' : 'bg-white sm:hover:shadow-md'
      } ${isFeatured && shineActive ? 'z-10' : ''}`}
      style={
        isFeatured
          ? {
            background: `linear-gradient(135deg, #dde3ea 0%, #f4f7fa ${Math.max(0, shinePercent - 20)}%, #ffffff ${shinePercent}%, #eef1f5 ${Math.min(100, shinePercent + 10)}%, #d3dae3 100%)`,
            transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transition: shineActive ? 'transform 100ms ease-out' : 'transform 500ms ease-out',
          }
          : undefined
      }
    >
      {isFeatured && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: shineActive ? 1 : 0,
            background: `radial-gradient(circle 150px at ${shinePos.x}px ${shinePos.y}px, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%)`,
          }}
        />
      )}
      <Link
        href={`/${locale}/e/${eventDetail.event.slug}`}
        prefetch={false}
        onClick={handleClick}
        className="relative block px-3 py-3 sm:px-5 sm:py-5"
      >
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={`flex min-w-12.5 flex-col items-center justify-center rounded-sm px-3 py-2 text-gray-800 ${
              isFeatured
                ? 'bg-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-2.5px_3px_rgba(100,116,139,0.25)] ring-1 ring-slate-200/80'
                : 'bg-amber-50'
            }`}
          >
            <span className="text-[9px] font-medium uppercase tracking-wide sm:text-[10px]">
              {weekday}
            </span>
            <span className="text-base font-bold sm:text-lg">{day}</span>
            <span className="text-xs font-medium capitalize">{month}</span>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 items-center gap-2">
              <h3
                className={`truncate font-bold text-gray-900 ${
                  isFeatured
                    ? "text-lg font-['Playfair_Display',serif] font-black italic"
                    : 'text-sm sm:text-lg'
                }`}
              >
                {eventDetail.event.name}
              </h3>
              {isFeatured && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-[#fdfcfa] px-3 py-1 text-[10px] font-medium tracking-wide text-slate-600 shadow-sm sm:text-xs">
                  <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {tFeatured('badge')}
                </span>
              )}
            </div>
            <div
              className={`flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-gray-600 sm:text-sm ${
                isFeatured
                  ? "mt-2 font-['DM_Sans',sans-serif] tracking-wide text-slate-500"
                  : 'mt-1'
              }`}
            >
              {location && (
                <span className="min-w-0 flex-1 truncate">
                  {location}
                </span>
              )}
            </div>
            {isFeatured && (
              <p className="mt-2 line-clamp-2 min-h-8 text-[11px] text-gray-700 font-['DM_Sans',sans-serif] sm:min-h-9 sm:text-xs">
                {tDescriptions(eventDetail.event.slug)}
              </p>
            )}
            {eventDetail.races.length > 0 && (
              <div
                className={`flex min-w-0 flex-nowrap gap-1.5 overflow-hidden ${
                  isFeatured ? 'mt-4' : 'mt-1.5'
                }`}
              >
                {eventDetail.races.map((race) => (
                  <DistanceBadge
                    key={race.id}
                    distanceKm={race.distanceKm}
                    locale={locale}
                    size="sm"
                    variant={isFeatured ? 'metallic' : 'default'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
