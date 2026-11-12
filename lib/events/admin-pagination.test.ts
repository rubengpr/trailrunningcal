import { describe, expect, it } from 'vitest';
import {
  ADMIN_EVENTS_SEARCH_MAX_LENGTH,
  buildAdminEventsHref,
  parseAdminEventPageRequest,
} from '@/lib/events/admin-pagination';

describe('admin event pagination URL state', () => {
  it('preserves repeated community and province parameters when paginating', () => {
    const parsed = parseAdminEventPageRequest({
      region: ['galicia', 'catalonia'], province: ['Lugo', 'Barcelona'], q: 'trail',
    });
    expect(parsed).toMatchObject({ regions: ['galicia', 'catalonia'], provinces: ['Lugo', 'Barcelona'] });
    const href = buildAdminEventsHref('es', { ...parsed, page: 2 });
    const params = new URL(href, 'http://localhost').searchParams;
    expect(params.getAll('region')).toEqual(['galicia', 'catalonia']);
    expect(params.getAll('province')).toEqual(['Lugo', 'Barcelona']);
    expect(params.get('page')).toBe('2');
  });

  it('parses valid page, search, and sorting values', () => {
    expect(parseAdminEventPageRequest({
      page: '3',
      q: '  ultra  ',
      region: 'catalonia',
      province: 'Girona',
      sort: 'name',
      direction: 'desc',
    })).toEqual({
      page: 3,
      search: 'ultra',
      regions: ['catalonia'],
      provinces: ['Girona'],
      sortColumn: 'name',
      sortDirection: 'desc',
    });
  });

  it('normalizes invalid values and caps search length', () => {
    const result = parseAdminEventPageRequest({
      page: '-2',
      q: 'x'.repeat(ADMIN_EVENTS_SEARCH_MAX_LENGTH + 10),
      sort: 'unknown',
      direction: 'sideways',
      province: 'Not a province',
    });

    expect(result).toEqual({
      page: 1,
      search: 'x'.repeat(ADMIN_EVENTS_SEARCH_MAX_LENGTH),
      regions: [],
      provinces: [],
      sortColumn: 'dates',
      sortDirection: 'asc',
    });
  });

  it('parses province sorting', () => {
    expect(parseAdminEventPageRequest({
      sort: 'province',
      direction: 'desc',
    })).toMatchObject({
      sortColumn: 'province',
      sortDirection: 'desc',
    });
  });

  it('builds a compact URL while preserving non-default state', () => {
    expect(buildAdminEventsHref('es', {
      page: 4,
      search: 'trail & mountain',
      regions: ['catalonia'],
      provinces: ['Girona'],
      sortColumn: 'name',
      sortDirection: 'desc',
    })).toBe(
      '/es/admin/eventos/activos?page=4&q=trail+%26+mountain&region=catalonia&province=Girona&sort=name&direction=desc',
    );

    expect(buildAdminEventsHref('ca', {
      page: 1,
      search: '',
      provinces: [],
      sortColumn: 'dates',
      sortDirection: 'asc',
    })).toBe('/ca/admin/eventos/activos');

    expect(buildAdminEventsHref('es', {
      page: 1,
      search: '',
      provinces: [],
      sortColumn: 'province',
      sortDirection: 'asc',
    })).toBe('/es/admin/eventos/activos?sort=province');
  });
});
