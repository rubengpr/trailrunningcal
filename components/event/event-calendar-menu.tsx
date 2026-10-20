'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { CalendarIcon } from '@/components/icons/calendar-icon';
import { useTranslations } from 'next-intl';
import { useFeatureFlagVariant } from '@/hooks/use-feature-flag-variant';
import { IconActionMenu } from '@/components/ui/icon-action-menu';
import { buildCalendarFile, buildCalendarLink } from '@/lib/events/calendar';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import type { CalendarEntry, CalendarButtonVariant } from '@/types/event-calendar.types';
import type { Locale } from '@/i18n';

interface EventCalendarMenuProps {
  entry: Omit<CalendarEntry, 'description'>;
  eventSlug: string;
  locale: Locale;
}

export function EventCalendarMenu({ entry, eventSlug, locale }: EventCalendarMenuProps) {
  const t = useTranslations('event.calendar');
  const flagVariant = useFeatureFlagVariant('event-calendar-button-label');
  const variant: CalendarButtonVariant | 'unassigned' = flagVariant === 'control' || flagVariant === 'icon_text' || flagVariant === 'google_icon' ? flagVariant : 'unassigned';
  const showLabel = variant === 'icon_text';
  const calendarEntry = { ...entry, description: t('description') };
  const properties = { event_id: entry.id, event_slug: eventSlug, locale, calendar_variant: variant };

  const exposureRef = useRef<string | null>(null);
  useEffect(() => {
    if (variant === 'unassigned') return;
    const exposureKey = `${eventSlug}:${variant}`;
    if (exposureRef.current === exposureKey) return;
    try {
      track(ANALYTICS_EVENTS.EVENT_CALENDAR_BUTTON_VIEWED, {
        event_id: entry.id,
        event_slug: eventSlug,
        locale,
        calendar_variant: variant,
        '$feature/event-calendar-button-label': variant,
      });
      exposureRef.current = exposureKey;
    } catch {
      // Calendar actions remain available without analytics.
    }
  }, [entry.id, eventSlug, locale, variant]);

  const captureOpen = () => {
    try {
      track(ANALYTICS_EVENTS.EVENT_CALENDAR_MENU_OPENED, properties);
    } catch {
      // Analytics must not prevent calendar actions.
    }
  };

  const selectOption = (option: 'google' | 'ics') => {
    try {
      track(ANALYTICS_EVENTS.EVENT_CALENDAR_OPTION_CLICKED, { ...properties, option });
    } catch {
      // Analytics must not prevent calendar actions.
    }
    if (option === 'google') {
      window.open(buildCalendarLink(calendarEntry), '_blank', 'noopener,noreferrer');
      return;
    }
    const url = URL.createObjectURL(new Blob([buildCalendarFile(calendarEntry)], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventSlug}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <IconActionMenu
      triggerAriaLabel={t('label')}
      triggerIcon={
        <>
          {variant === 'google_icon' ? (
            <Image src="/icons/google-calendar.png" width={20} height={20} alt="" unoptimized className="h-5 w-5 shrink-0" />
          ) : (
            <CalendarIcon className="h-5 w-5 shrink-0" />
          )}
          {showLabel ? <span>{t('label')}</span> : null}
        </>
      }
      className={showLabel ? 'order-first flex w-full' : 'flex w-[42px] flex-none sm:w-auto sm:flex-1'}
      triggerAsButton={showLabel}
      triggerButtonVariant="secondary"
      triggerClassName={showLabel
        ? 'h-10 w-full gap-2 whitespace-nowrap text-sm'
        : 'flex h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-auto'}
      onOpen={captureOpen}
      footer={t('notice')}
      items={[
        { id: 'google', label: t('google'), onSelect: () => selectOption('google') },
        { id: 'ics', label: t('ics'), onSelect: () => selectOption('ics') },
      ]}
    />
  );
}
