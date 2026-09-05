'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildAdminEventsHref } from '@/lib/events/admin-pagination';
import type { AdminEventPageRequest } from '@/types/admin-events.types';

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

interface AdminEventsPaginationProps {
  page: number;
  totalPages: number;
  query: AdminEventPageRequest;
  locale: string;
}

function getPaginationItems(page: number, totalPages: number): PaginationItem[] {
  const visiblePages = new Set([1, totalPages]);

  for (let candidate = page - 2; candidate <= page + 2; candidate += 1) {
    if (candidate >= 1 && candidate <= totalPages) {
      visiblePages.add(candidate);
    }
  }

  const pages = [...visiblePages].sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  for (const [index, visiblePage] of pages.entries()) {
    const previousPage = pages[index - 1];
    if (previousPage !== undefined && visiblePage - previousPage > 1) {
      items.push(index === 1 ? 'start-ellipsis' : 'end-ellipsis');
    }
    items.push(visiblePage);
  }

  return items;
}

export function AdminEventsPagination({
  page,
  totalPages,
  query,
  locale,
}: AdminEventsPaginationProps): React.ReactElement {
  const t = useTranslations('adminEvents');
  const paginationItems = getPaginationItems(page, totalPages);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1">
      {page > 1 ? (
        <Link
          href={buildAdminEventsHref(locale, { ...query, page: page - 1 })}
          title={t('pagination.previous')}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-300">
          <ChevronLeft className="size-4" />
        </span>
      )}

      {paginationItems.map((item) =>
        typeof item === 'number' ? (
          item === page ? (
            <span
              key={item}
              className="inline-flex size-9 items-center justify-center rounded-lg bg-black text-sm font-medium text-white"
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              href={buildAdminEventsHref(locale, { ...query, page: item })}
              title={t('pagination.page', { page: item })}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {item}
            </Link>
          )
        ) : (
          <span
            key={item}
            className="inline-flex size-9 items-center justify-center text-sm text-gray-400"
          >
            …
          </span>
        ),
      )}

      {page < totalPages ? (
        <Link
          href={buildAdminEventsHref(locale, { ...query, page: page + 1 })}
          title={t('pagination.next')}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-300">
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
