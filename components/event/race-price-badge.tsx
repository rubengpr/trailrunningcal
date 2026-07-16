'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ChevronDown, Coins, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { getMadridCalendarDate, getVisibleRaceTiers } from '@/lib/events/tier-pricing';
import type { EventRaceTier } from '@/types/event.types';

interface RacePriceBadgeProps {
  locale: Locale;
  raceId: string;
  tiers: EventRaceTier[];
}

interface PriceBadgeContentProps {
  isOpen: boolean;
  label: string;
}

interface TierScheduleListProps {
  locale: Locale;
  tiers: EventRaceTier[];
}

type DisclosureSurface = 'desktop_popover' | 'mobile_modal';

const BADGE_CLASSES =
  'inline-flex max-w-full items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-normal tabular-nums text-gray-800';
const BADGE_TRIGGER_CLASSES = `${BADGE_CLASSES} cursor-pointer text-left transition-colors hover:bg-gray-100`;
const subscribeToHydration = () => () => {};

function useHasHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
}

function formatPrice(priceEur: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    currency: 'EUR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: 'currency',
  })
    .format(priceEur)
    .replace(/\s+€/u, '€');
}

function formatDeadline(endsAt: string): string {
  const [, month, day] = endsAt.split('-');
  return `${day}/${month}`;
}

function PriceBadgeContent({ isOpen, label }: PriceBadgeContentProps) {
  return (
    <>
      <Coins className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap tabular-nums">{label}</span>
      <ChevronDown
        className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`}
        strokeWidth={2.5}
      />
    </>
  );
}

function TierScheduleList({ locale, tiers }: TierScheduleListProps) {
  const t = useTranslations('event.pricing');

  return (
    <ul className="divide-y divide-gray-100">
      {tiers.map((tier, index) => {
        const price =
          tier.priceEur === 0 ? t('free') : formatPrice(tier.priceEur, locale);
        const deadline = tier.endsAt
          ? t('until', { date: formatDeadline(tier.endsAt) })
          : null;

        return (
          <li
            className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
            key={tier.id ?? tier.endsAt ?? index}
          >
            <span className="font-semibold tabular-nums text-gray-950">
              {price}
            </span>
            {deadline ? (
              <span className="text-right text-xs text-gray-500">{deadline}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function RacePriceBadge({ locale, raceId, tiers }: RacePriceBadgeProps) {
  const t = useTranslations('event.pricing');
  const hasHydrated = useHasHydrated();
  const [isDesktopOpen, setIsDesktopOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const desktopPopoverRef = useRef<HTMLDivElement>(null);
  const hasTrackedOpen = useRef(false);

  useEffect(() => {
    if (!isDesktopOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!desktopPopoverRef.current?.contains(event.target as Node)) {
        setIsDesktopOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [isDesktopOpen]);

  useEffect(() => {
    if (!isDesktopOpen && !isMobileOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDesktopOpen(false);
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isDesktopOpen, isMobileOpen]);

  useEffect(() => {
    if (!isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen]);

  if (tiers.length === 0) return null;

  if (tiers.length === 1) {
    const tier = tiers[0];
    const price = tier.priceEur === 0 ? t('free') : formatPrice(tier.priceEur, locale);
    const label = tier.endsAt
      ? `${price} ${t('until', { date: formatDeadline(tier.endsAt) })}`
      : price;

    return (
      <div className={BADGE_CLASSES} data-testid="race-price">
        <Coins className="h-3.5 w-3.5 shrink-0" />
        {label}
      </div>
    );
  }

  if (!hasHydrated) {
    return (
      <div
        aria-hidden="true"
        className={`${BADGE_CLASSES} h-6 w-40`}
        data-testid="race-price-placeholder"
      >
        <Coins className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="h-2.5 flex-1 rounded-sm bg-gray-200" />
      </div>
    );
  }

  const scheduleTiers = getVisibleRaceTiers(tiers, getMadridCalendarDate());

  if (scheduleTiers.length === 0) return null;

  const currentTier = scheduleTiers[0];
  const upcomingTierCount = scheduleTiers.length - 1;
  const currentPrice =
    currentTier.priceEur === 0
      ? t('free')
      : formatPrice(currentTier.priceEur, locale);
  const currentLabel = currentTier.endsAt
    ? `${currentPrice} ${t('until', {
        date: formatDeadline(currentTier.endsAt),
      })}`
    : currentPrice;

  if (upcomingTierCount === 0) {
    return (
      <div className={BADGE_CLASSES} data-testid="race-price">
        <Coins className="h-3.5 w-3.5 shrink-0" />
        {currentLabel}
      </div>
    );
  }

  const trackFirstOpen = (surface: DisclosureSurface) => {
    if (hasTrackedOpen.current) return;

    hasTrackedOpen.current = true;
    track(ANALYTICS_EVENTS.RACE_TIERS_OPENED, {
      race_id: raceId,
      surface,
      tier_count: scheduleTiers.length,
    });
  };

  return (
    <div
      className="relative inline-block min-w-0 text-sm"
      data-testid="race-price"
    >
      <button
        aria-expanded={isMobileOpen}
        aria-haspopup="dialog"
        className={`${BADGE_TRIGGER_CLASSES} sm:hidden`}
        data-testid="race-price-mobile-trigger"
        onClick={() => {
          trackFirstOpen('mobile_modal');
          setIsMobileOpen(true);
        }}
        type="button"
      >
        <PriceBadgeContent isOpen={isMobileOpen} label={currentLabel} />
      </button>

      <div className="relative hidden sm:block" ref={desktopPopoverRef}>
        <button
          aria-expanded={isDesktopOpen}
          className={BADGE_TRIGGER_CLASSES}
          data-testid="race-price-desktop-trigger"
          onClick={() => {
            const willOpen = !isDesktopOpen;
            setIsDesktopOpen(willOpen);
            if (willOpen) trackFirstOpen('desktop_popover');
          }}
          type="button"
        >
          <PriceBadgeContent isOpen={isDesktopOpen} label={currentLabel} />
        </button>

        {isDesktopOpen ? (
          <div
            className="absolute left-0 top-full z-20 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
            data-testid="race-price-desktop-popover"
          >
            <TierScheduleList locale={locale} tiers={scheduleTiers} />
          </div>
        ) : null}
      </div>

      {isMobileOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:hidden"
          role="dialog"
        >
          <button
            aria-label={t('close')}
            className="absolute inset-0 cursor-default bg-gray-950/45"
            onClick={() => setIsMobileOpen(false)}
            type="button"
          />
          <div className="relative z-10 w-full rounded-t-2xl bg-white px-5 pb-7 pt-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-950">{t('title')}</h3>
              <button
                aria-label={t('close')}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                onClick={() => setIsMobileOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <TierScheduleList locale={locale} tiers={scheduleTiers} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
