import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/errors';
import { parsePublicEventPageRequest } from './public-validation';

function params(query = ''): URLSearchParams {
  return new URLSearchParams(query);
}

describe('parsePublicEventPageRequest', () => {
  it('parses pagination, repeated filters, scopes, and reference date', () => {
    expect(parsePublicEventPageRequest(params(
      'page=2&referenceDate=2026-08-06&month=0&month=11' +
      '&province=Girona&distance=20-30&type=ultra-trail' +
      '&scopeProvince=Girona&scopeType=marcha',
    ))).toEqual({
      page: 2,
      referenceDate: '2026-08-06',
      filters: {
        months: [0, 11],
        provinces: ['Girona'],
        distanceRanges: ['20-30'],
        raceTypes: ['ultra-trail'],
      },
      scope: {
        province: 'Girona',
        raceType: 'marcha',
      },
    });
  });

  it('defaults to page one with empty filters', () => {
    const result = parsePublicEventPageRequest(params());

    expect(result.page).toBe(1);
    expect(result.filters).toEqual({
      months: [],
      provinces: [],
      distanceRanges: [],
      raceTypes: [],
    });
    expect(result.scope).toBeUndefined();
    expect(result.referenceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each([
    ['page=0', 'Invalid page'],
    ['page=1.5', 'Invalid page'],
    ['page=21474838', 'Invalid page'],
    ['referenceDate=2026-02-30', 'Invalid reference date'],
    ['month=12', 'Invalid month filter'],
    ['distance=unknown', 'Invalid distance filter'],
    ['type=road', 'Invalid race type filter'],
    ['scopeType=road', 'Invalid race type scope'],
    ['province=%20', 'Invalid province filter'],
  ])('rejects %s', (query, message) => {
    expect(() => parsePublicEventPageRequest(params(query))).toThrow(
      new ValidationError(message, 400),
    );
  });
});
