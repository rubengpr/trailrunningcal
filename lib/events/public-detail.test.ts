import { describe, expect, it } from 'vitest';
import { toPublicEventDetail } from '@/lib/events/utils';
import type { TrailEventDetail } from '@/types/event.types';

describe('toPublicEventDetail', () => {
  it('includes only fields required by the public calendar client', () => {
    const detail: TrailEventDetail = {
      event: {
        id: 'event-id',
        name: 'Trail Event',
        slug: 'trail-event',
        websiteUrl: 'https://example.com',
        organizerId: 'organizer-id',
        description: 'Internal source description',
        heroImageFilename: 'hero.jpg',
        updatedAt: '2026-06-20T10:00:00.000Z',
      },
      races: [{
        id: 'race-id',
        name: '21K',
        date: '2027-05-01',
        distanceKm: 21,
        elevationGainM: 900,
        city: 'Barcelona',
        province: 'Barcelona',
        mapUrl: 'https://example.com/private-map',
        priceEur: [{ price_eur: 30 }],
      }],
      allRaceCount: 2,
      dateRange: { startDate: '2027-05-01', endDate: '2027-05-01' },
      location: {
        city: 'Barcelona',
        province: 'Barcelona',
        groups: [{ province: 'Barcelona', cities: ['Barcelona'] }],
        isMultipleLocations: false,
      },
    };

    expect(toPublicEventDetail(detail)).toEqual({
      event: { id: 'event-id', name: 'Trail Event', slug: 'trail-event' },
      races: [{
        id: 'race-id',
        name: '21K',
        date: '2027-05-01',
        distanceKm: 21,
        elevationGainM: 900,
        city: 'Barcelona',
        province: 'Barcelona',
      }],
      dateRange: { startDate: '2027-05-01', endDate: '2027-05-01' },
      location: {
        city: 'Barcelona',
        province: 'Barcelona',
        groups: [{ province: 'Barcelona', cities: ['Barcelona'] }],
        isMultipleLocations: false,
      },
    });
  });
});
