import type {
  AdminEventPageRequest,
  AdminEventSortColumn,
  AdminEventSortDirection,
} from '@/types/admin-events.types';

export const ADMIN_EVENTS_PAGE_SIZE = 50;
export const ADMIN_EVENTS_SEARCH_MAX_LENGTH = 200;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  if (value === undefined) return 1;

  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function parseSortColumn(value: string | undefined): AdminEventSortColumn {
  return value === 'name' || value === 'province' ? value : 'dates';
}

function parseSortDirection(
  value: string | undefined,
): AdminEventSortDirection {
  return value === 'desc' ? 'desc' : 'asc';
}

export function parseAdminEventPageRequest(
  searchParams: SearchParams,
): AdminEventPageRequest {
  return {
    page: parsePage(firstValue(searchParams.page)),
    search: (firstValue(searchParams.q) ?? '')
      .trim()
      .slice(0, ADMIN_EVENTS_SEARCH_MAX_LENGTH),
    sortColumn: parseSortColumn(firstValue(searchParams.sort)),
    sortDirection: parseSortDirection(firstValue(searchParams.direction)),
  };
}

export function buildAdminEventsHref(
  locale: string,
  input: AdminEventPageRequest,
): string {
  const searchParams = new URLSearchParams();

  if (input.page > 1) {
    searchParams.set('page', input.page.toString());
  }
  if (input.search) {
    searchParams.set('q', input.search);
  }
  if (input.sortColumn !== 'dates') {
    searchParams.set('sort', input.sortColumn);
  }
  if (input.sortDirection !== 'asc') {
    searchParams.set('direction', input.sortDirection);
  }

  const query = searchParams.toString();
  const pathname = `/${locale}/admin/eventos/activos`;
  return query ? `${pathname}?${query}` : pathname;
}
