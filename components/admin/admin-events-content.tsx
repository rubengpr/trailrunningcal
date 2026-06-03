'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BaseModal } from '@/components/ui/base-modal';
import { SectionHeader } from '@/components/ui/section-header';
import { cleanUrl } from '@/lib/utils/url';
import type { TrailEventDetail } from '@/types/event.types';

interface AdminEventsContentProps {
  events: TrailEventDetail[];
}

export function AdminEventsContent({ events }: AdminEventsContentProps) {
  const t = useTranslations('adminEvents');
  const locale = useLocale();
  const router = useRouter();
  const [descriptionModalEvent, setDescriptionModalEvent] = useState<TrailEventDetail | null>(null);

  const subtitle = events.length === 1
    ? t('eventCountOne')
    : t('eventCount', { count: events.length });

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title={t('title')}
        subtitle={subtitle}
        action={
          <Button onClick={() => router.push(`/${locale}/admin/eventos/descripciones`)}>
            {t('generateDescriptions')}
          </Button>
        }
      />

      {events.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {t('empty')}
        </p>
      ) : (
        <div className="w-full rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  <th className="border-b border-gray-100 px-4 py-3 font-medium">
                    {t('columns.name')}
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 font-medium">
                    {t('columns.website')}
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 text-right font-medium">
                    {t('columns.races')}
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 font-medium">
                    {t('columns.description')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {events.map((eventDetail) => {
                  const { event } = eventDetail;
                  const description = event.description ?? '';
                  const truncated = description.length > 80
                    ? `${description.slice(0, 80)}…`
                    : description;

                  return (
                    <tr key={event.id} className="align-middle hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="max-w-[200px] px-4 py-3">
                        <Link
                          href={`/${locale}/e/${event.slug}`}
                          prefetch={false}
                          className="block truncate text-sm font-medium text-gray-900 hover:underline"
                        >
                          {event.name}
                        </Link>
                      </td>
                      <td className="max-w-[180px] px-4 py-3">
                        {event.websiteUrl ? (
                          <a
                            href={event.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-gray-500 hover:text-gray-800 hover:underline"
                          >
                            {cleanUrl(event.websiteUrl)}
                          </a>
                        ) : (
                          <span className="text-red-600">{t('missingUrl')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {eventDetail.allRaceCount}
                      </td>
                      <td className="max-w-[300px] px-4 py-3">
                        {description ? (
                          <button
                            type="button"
                            onClick={() => setDescriptionModalEvent(eventDetail)}
                            className="text-left text-gray-700 hover:opacity-70 transition-opacity"
                          >
                            {truncated}
                          </button>
                        ) : (
                          <span className="text-gray-400">{t('noDescription')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {descriptionModalEvent && (
        <BaseModal
          isOpen
          onClose={() => setDescriptionModalEvent(null)}
          title={descriptionModalEvent.event.name}
          maxWidth="2xl"
        >
          <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
            {descriptionModalEvent.event.description}
          </p>
        </BaseModal>
      )}
    </div>
  );
}
