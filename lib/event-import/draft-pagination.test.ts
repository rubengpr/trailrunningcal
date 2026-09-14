import { describe, expect, it } from 'vitest';
import {
  buildEventImportDraftsHref,
  parseEventImportDraftPageRequest,
} from './draft-pagination';

describe('event import draft pagination', () => {
  it('normalizes page, search, and draft filters', () => {
    expect(parseEventImportDraftPageRequest({
      page: '3',
      q: '  ultra  ',
      draftId: '5cd34b8e-8803-4b2d-bbae-8c7ba2a0a9ba',
    })).toEqual({
      page: 3,
      search: 'ultra',
      draftId: '5cd34b8e-8803-4b2d-bbae-8c7ba2a0a9ba',
    });
  });

  it('falls back safely for invalid pagination values', () => {
    expect(parseEventImportDraftPageRequest({
      page: '-1',
      draftId: 'not-a-uuid',
    })).toEqual({ page: 1, search: '', draftId: null });
  });

  it('preserves filters in page links without trailing slashes', () => {
    expect(buildEventImportDraftsHref('es', {
      page: 2,
      search: 'ultra',
      draftId: null,
    })).toBe('/es/admin/eventos/borradores?page=2&q=ultra');
  });
});
