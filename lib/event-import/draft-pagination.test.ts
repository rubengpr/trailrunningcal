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
      province: undefined,
      draftId: '5cd34b8e-8803-4b2d-bbae-8c7ba2a0a9ba',
      sortColumn: 'dates',
      sortDirection: 'asc',
    });
  });

  it('falls back safely for invalid pagination values', () => {
    expect(parseEventImportDraftPageRequest({
      page: '-1',
      draftId: 'not-a-uuid',
    })).toEqual({
      page: 1,
      search: '',
      province: undefined,
      draftId: null,
      sortColumn: 'dates',
      sortDirection: 'asc',
    });
  });

  it('preserves filters in page links without trailing slashes', () => {
    expect(buildEventImportDraftsHref('es', {
      page: 2,
      search: 'ultra',
      province: 'A Coruña',
      draftId: null,
      sortColumn: 'races',
      sortDirection: 'desc',
    })).toBe('/es/admin/eventos/borradores?page=2&q=ultra&province=A+Coru%C3%B1a&sort=races&direction=desc');
  });

  it('accepts known provinces and ignores invalid values', () => {
    expect(parseEventImportDraftPageRequest({ province: 'Lugo' }).province)
      .toBe('Lugo');
    expect(parseEventImportDraftPageRequest({ province: ['Ourense', 'Lugo'] }).province)
      .toBe('Ourense');
    expect(parseEventImportDraftPageRequest({ province: 'Galicia' }).province)
      .toBeUndefined();
    expect(parseEventImportDraftPageRequest({ province: '' }).province)
      .toBeUndefined();
  });

  it('parses supported sorting values and ignores unsupported ones', () => {
    expect(parseEventImportDraftPageRequest({ sort: 'name', direction: 'desc' }))
      .toMatchObject({ sortColumn: 'name', sortDirection: 'desc' });
    expect(parseEventImportDraftPageRequest({ sort: 'website', direction: 'sideways' }))
      .toMatchObject({ sortColumn: 'dates', sortDirection: 'asc' });
  });
});
