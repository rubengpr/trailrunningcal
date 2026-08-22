import { describe, expect, it } from 'vitest';
import {
  ADMIN_EVENTS_SEARCH_MAX_LENGTH,
  buildAdminEventsHref,
  parseAdminEventPageRequest,
} from '@/lib/events/admin-pagination';

describe('admin event pagination URL state', () => {
  it('parses valid page, search, and sorting values', () => {
    expect(parseAdminEventPageRequest({
      page: '3',
      q: '  ultra  ',
      sort: 'name',
      direction: 'desc',
    })).toEqual({
      page: 3,
      search: 'ultra',
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
    });

    expect(result).toEqual({
      page: 1,
      search: 'x'.repeat(ADMIN_EVENTS_SEARCH_MAX_LENGTH),
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
      sortColumn: 'name',
      sortDirection: 'desc',
    })).toBe(
      '/es/admin/eventos/activos?page=4&q=trail+%26+mountain&sort=name&direction=desc',
    );

    expect(buildAdminEventsHref('ca', {
      page: 1,
      search: '',
      sortColumn: 'dates',
      sortDirection: 'asc',
    })).toBe('/ca/admin/eventos/activos');

    expect(buildAdminEventsHref('es', {
      page: 1,
      search: '',
      sortColumn: 'province',
      sortDirection: 'asc',
    })).toBe('/es/admin/eventos/activos?sort=province');
  });
});
