import { describe, expect, it } from 'vitest';
import { buildEventJsonLd } from './json-ld';
import type { TrailEventDetail } from '@/types/event.types';

function buildDetail(province: string): TrailEventDetail {
  return {
    event: {
      id: 'event-1',
      name: 'Trail test',
      slug: 'trail-test',
      websiteUrl: null,
      organizerId: null,
      description: null,
      heroImageFilename: null,
      updatedAt: null,
    },
    races: [],
    allRaceCount: 0,
    dateRange: { startDate: null, endDate: null },
    location: {
      city: 'La Massana',
      province,
      groups: [],
      isMultipleLocations: false,
    },
  };
}

describe('buildEventJsonLd', () => {
  it('uses Andorra as the country for Andorran events', () => {
    const jsonLd = buildEventJsonLd(buildDetail('Andorra'), 'trail-test', 'es');

    expect(jsonLd.location).toMatchObject({
      address: { addressCountry: 'AD' },
    });
  });

  it('uses Spain as the country for Spanish events', () => {
    const jsonLd = buildEventJsonLd(buildDetail('Granada'), 'trail-test', 'es');

    expect(jsonLd.location).toMatchObject({
      address: { addressCountry: 'ES' },
    });
  });
});
