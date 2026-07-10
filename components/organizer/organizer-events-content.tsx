'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatEventDateRangeNumeric,
  formatEventLocationLabel,
} from '@/lib/events/utils';
import { cleanUrl } from '@/lib/utils/url';
import type { Locale } from '@/i18n';
import type { TrailEventDetail } from '@/types/event.types';

interface OrganizerEventsContentProps {
  events: TrailEventDetail[];
}

export function OrganizerEventsContent({
  events,
}: OrganizerEventsContentProps): React.ReactElement {
  const t = useTranslations('organizer.events');
  const locale = useLocale() as Locale;
  const subtitle = events.length === 1
    ? t('eventCountOne')
    : t('eventCount', { count: events.length });

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title={t('title')} subtitle={subtitle} />

      {events.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {t('empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableCell header>{t('columns.name')}</TableCell>
            <TableCell header>{t('columns.website')}</TableCell>
            <TableCell header>{t('columns.location')}</TableCell>
            <TableCell header>{t('columns.dates')}</TableCell>
            <TableCell header align="right">{t('columns.races')}</TableCell>
          </TableHeader>
          <TableBody>
            {events.map((eventDetail) => {
              const locationLabel = formatEventLocationLabel(
                eventDetail.location,
                locale,
              );

              return (
                <TableRow key={eventDetail.event.id}>
                  <TableCell className="max-w-[220px]">
                    <Link
                      href={`/${locale}/e/${eventDetail.event.slug}`}
                      prefetch={false}
                      className="block truncate text-sm font-medium text-gray-900 hover:underline"
                    >
                      {eventDetail.event.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    {eventDetail.event.websiteUrl ? (
                      <a
                        href={eventDetail.event.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm text-gray-500 hover:text-gray-800 hover:underline"
                      >
                        {cleanUrl(eventDetail.event.websiteUrl)}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">{t('missingWebsite')}</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <span className="block truncate text-sm text-gray-700">
                      {locationLabel || t('missingLocation')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {formatEventDateRangeNumeric(eventDetail.dateRange, t('noDates'))}
                  </TableCell>
                  <TableCell align="right" className="text-sm tabular-nums text-gray-700">
                    {eventDetail.allRaceCount}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
