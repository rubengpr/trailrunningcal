import { describe, expect, it } from 'vitest';
import {
  buildEventImportDraftsHref,
  parseEventImportDraftPageRequest,
} from './draft-pagination';

describe('event import draft pagination', () => {
  it('preserves repeated community and province parameters when paginating', () => {
    const parsed = parseEventImportDraftPageRequest({
      region: ['galicia', 'catalonia'], province: ['Lugo', 'Barcelona'], q: 'trail',
    });
    expect(parsed).toMatchObject({ regions: ['galicia', 'catalonia'], provinces: ['Lugo', 'Barcelona'] });
    const href = buildEventImportDraftsHref('es', { ...parsed, page: 2 });
    const params = new URL(href, 'http://localhost').searchParams;
    expect(params.getAll('region')).toEqual(['galicia', 'catalonia']);
    expect(params.getAll('province')).toEqual(['Lugo', 'Barcelona']);
    expect(params.get('page')).toBe('2');
  });

  it('normalizes page, search, and draft filters', () => {
    expect(parseEventImportDraftPageRequest({
      page: '3',
      q: '  ultra  ',
      draftId: '5cd34b8e-8803-4b2d-bbae-8c7ba2a0a9ba',
    })).toEqual({
      page: 3,
      search: 'ultra',
      regions: [],
      provinces: [],
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
      regions: [],
      provinces: [],
      draftId: null,
      sortColumn: 'dates',
      sortDirection: 'asc',
    });
  });

  it('preserves filters in page links without trailing slashes', () => {
    expect(buildEventImportDraftsHref('es', {
      page: 2,
      search: 'ultra',
      regions: ['galicia'],
      provinces: ['A Coruña'],
      draftId: null,
      sortColumn: 'races',
      sortDirection: 'desc',
    })).toBe('/es/admin/eventos/borradores?page=2&q=ultra&region=galicia&province=A+Coru%C3%B1a&sort=races&direction=desc');
  });

  it('accepts repeated provinces and ignores invalid values', () => {
    expect(parseEventImportDraftPageRequest({ province: ['Ourense', 'Lugo', 'Lugo'] }).provinces)
      .toEqual(['Ourense', 'Lugo']);
    expect(parseEventImportDraftPageRequest({ province: 'Galicia' }).provinces).toEqual([]);
  });

  it('parses supported sorting values and ignores unsupported ones', () => {
    for (const direction of ['asc', 'desc']) {
      const request = parseEventImportDraftPageRequest({ sort: 'added', direction, page: '2' });
      expect(request).toMatchObject({ sortColumn: 'added', sortDirection: direction });
      expect(parseEventImportDraftPageRequest(Object.fromEntries(
        new URL(buildEventImportDraftsHref('es', request), 'http://localhost').searchParams,
      ))).toEqual(request);
    }
    expect(parseEventImportDraftPageRequest({ sort: 'name', direction: 'desc' }))
      .toMatchObject({ sortColumn: 'name', sortDirection: 'desc' });
    expect(parseEventImportDraftPageRequest({ sort: 'website', direction: 'sideways' }))
      .toMatchObject({ sortColumn: 'dates', sortDirection: 'asc' });
  });
});
