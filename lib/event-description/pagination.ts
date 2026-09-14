export const EVENT_DESCRIPTION_PAGE_SIZE = 50;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseEventDescriptionPage(
  searchParams: SearchParams,
): number {
  const page = Number(firstValue(searchParams.page) ?? 1);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function buildEventDescriptionsHref(
  locale: string,
  page: number,
): string {
  const pathname = `/${locale}/admin/eventos/descripciones`;
  return page > 1 ? `${pathname}?page=${page}` : pathname;
}
