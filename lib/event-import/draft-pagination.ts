import type {
  EventImportDraftPageRequest,
} from '@/types/event-import-draft.types';

export const EVENT_IMPORT_DRAFTS_PAGE_SIZE = 50;
const SEARCH_MAX_LENGTH = 200;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseEventImportDraftPageRequest(
  searchParams: SearchParams,
): EventImportDraftPageRequest {
  const rawPage = Number(firstValue(searchParams.page) ?? 1);
  const rawDraftId = firstValue(searchParams.draftId);

  return {
    page: Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
    search: (firstValue(searchParams.q) ?? '')
      .trim()
      .slice(0, SEARCH_MAX_LENGTH),
    draftId: rawDraftId && UUID_PATTERN.test(rawDraftId) ? rawDraftId : null,
  };
}

export function buildEventImportDraftsHref(
  locale: string,
  input: EventImportDraftPageRequest,
): string {
  const searchParams = new URLSearchParams();
  if (input.page > 1) searchParams.set('page', input.page.toString());
  if (input.search) searchParams.set('q', input.search);
  if (input.draftId) searchParams.set('draftId', input.draftId);

  const query = searchParams.toString();
  const pathname = `/${locale}/admin/eventos/borradores`;
  return query ? `${pathname}?${query}` : pathname;
}
