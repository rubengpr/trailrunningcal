import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { locales } from '@/i18n';
import {
  revalidateCategoryPages,
  revalidateDestinationPages,
  revalidateEventMutation,
  revalidateEventPages,
  revalidateProvincePage,
} from './revalidation';
import { DESTINATION_PROVINCE_IDS, REGION_IDS } from '@/lib/geography/destinations';
import { RACE_CATEGORY_SLUGS } from '@/lib/races/race-types';

const { revalidatePath, revalidateTag } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath, revalidateTag }));

const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});

afterAll(() => consoleInfo.mockRestore());

const eventDetail = {
  event: {
    id: 'event-1',
    name: 'Trail Event',
    slug: 'trail-event',
    websiteUrl: 'https://example.com',
    organizerId: null,
    description: 'Original description',
    heroImageFilename: null,
    updatedAt: null,
  },
  races: [{
    id: 'race-1',
    name: 'Trail Event 21K',
    date: '2027-05-01',
    distanceKm: 21,
    elevationGainM: 900,
    city: 'Barcelona',
    province: 'Barcelona',
    resultsUrl: null,
    tiers: [],
  }],
  allRaceCount: 1,
  dateRange: { startDate: '2027-05-01', endDate: '2027-05-01' },
  location: {
    city: 'Barcelona',
    province: 'Barcelona',
    groups: [{ province: 'Barcelona', cities: ['Barcelona'] }],
    isMultipleLocations: false,
  },
};

describe('revalidateProvincePage', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    revalidateTag.mockReset();
  });

  it('revalidates every localized destination page for a newly supported province', () => {
    revalidateProvincePage('Granada', 'test');

    // Every locale of the province page, plus its community page.
    expect(revalidatePath).toHaveBeenCalledTimes(locales.length * 2);
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/ca/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/en/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/andalucia');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/d/andalucia');
    expect(consoleInfo).toHaveBeenCalledWith(expect.stringContaining(
      '"affectedPathCount":4',
    ));
  });
});

describe('revalidateEventPages', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
  });

  it('revalidates every localized public event page', () => {
    revalidateEventPages('vertical-la-bandera', 'test');

    expect(revalidatePath).toHaveBeenCalledTimes(locales.length);
    expect(revalidatePath).toHaveBeenCalledWith('/es/e/vertical-la-bandera');
    expect(revalidatePath).toHaveBeenCalledWith('/ca/e/vertical-la-bandera');
    expect(revalidatePath).toHaveBeenCalledWith('/en/e/vertical-la-bandera');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/e/vertical-la-bandera');
    expect(consoleInfo).toHaveBeenLastCalledWith(expect.stringContaining(
      '"source":"test"',
    ));
  });

  it('records one aggregate count for an event batch', () => {
    revalidateEventPages(['event-one', 'event-two'], 'translation-promotion');

    expect(revalidatePath).toHaveBeenCalledTimes(locales.length * 2);
    expect(consoleInfo).toHaveBeenLastCalledWith(expect.stringContaining(
      `"affectedPathCount":${locales.length * 2}`,
    ));
  });
});

describe('revalidateEventMutation', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    consoleInfo.mockClear();
  });

  it('revalidates only localized event pages when a list-invisible field changes', () => {
    revalidateEventMutation(eventDetail, {
      ...eventDetail,
      event: { ...eventDetail.event, description: 'Updated description' },
    }, 'test');

    expect(revalidatePath).toHaveBeenCalledTimes(locales.length);
    expect(revalidatePath).toHaveBeenCalledWith('/es/e/trail-event');
    expect(revalidatePath).not.toHaveBeenCalledWith('/es');
    expect(revalidatePath).not.toHaveBeenCalledWith('/es/t/media-maraton');
    expect(consoleInfo).toHaveBeenLastCalledWith(expect.stringContaining(
      '"listingChanged":false',
    ));
  });

  it('revalidates listings once when their public projection changes', () => {
    revalidateEventMutation(eventDetail, {
      ...eventDetail,
      event: { ...eventDetail.event, name: 'Updated Trail Event' },
      races: [...eventDetail.races, { ...eventDetail.races[0], id: 'race-2' }],
    }, 'test');

    expect(revalidatePath).toHaveBeenCalledTimes(20);
    expect(revalidatePath).toHaveBeenCalledWith('/es');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/t/media-maraton');
    expect(revalidatePath).not.toHaveBeenCalledWith('/fr/t/backyard');
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/cataluna/barcelona');
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/cataluna');
    expect(consoleInfo).toHaveBeenLastCalledWith(expect.stringContaining(
      '"listingChanged":true',
    ));
  });

  it('includes old and new event and province paths for a move', () => {
    revalidateEventMutation(eventDetail, {
      ...eventDetail,
      event: { ...eventDetail.event, slug: 'moved-trail-event' },
      races: [{ ...eventDetail.races[0], province: 'Girona', city: 'Girona' }],
      location: {
        city: 'Girona',
        province: 'Girona',
        groups: [{ province: 'Girona', cities: ['Girona'] }],
        isMultipleLocations: false,
      },
    }, 'test');

    expect(revalidatePath).toHaveBeenCalledTimes(28);
    expect(revalidatePath).toHaveBeenCalledWith('/es/e/trail-event');
    expect(revalidatePath).toHaveBeenCalledWith('/es/e/moved-trail-event');
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/cataluna/barcelona');
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/cataluna/girona');
  });

  it('revalidates the deleted event and its listing paths', () => {
    revalidateEventMutation(eventDetail, null, 'test');

    expect(revalidatePath).toHaveBeenCalledTimes(20);
    expect(revalidatePath).toHaveBeenCalledWith('/es/e/trail-event');
    expect(revalidatePath).toHaveBeenCalledWith('/es');
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/cataluna/barcelona');
  });

  it('invalidates the union of old and new matching categories', () => {
    revalidateEventMutation(eventDetail, {
      ...eventDetail,
      races: [{ ...eventDetail.races[0], distanceKm: 50 }],
    }, 'test');

    expect(revalidatePath).toHaveBeenCalledTimes(24);
    expect(revalidatePath).toHaveBeenCalledWith('/es/t/media-maraton');
    expect(revalidatePath).toHaveBeenCalledWith('/es/t/ultra-trail');
    expect(revalidatePath).not.toHaveBeenCalledWith('/es/t/maraton');
  });
});

describe('public listing page revalidation', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
  });

  it('revalidates every localized event-type page', () => {
    revalidateCategoryPages('test');

    expect(revalidatePath).toHaveBeenCalledTimes(
      locales.length * RACE_CATEGORY_SLUGS.length,
    );
    expect(revalidatePath).toHaveBeenCalledWith('/es/t/ultra-trail');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/t/backyard');
  });

  it('revalidates every localized region and destination page', () => {
    revalidateDestinationPages('test');

    expect(revalidatePath).toHaveBeenCalledTimes(
      locales.length * (REGION_IDS.length + DESTINATION_PROVINCE_IDS.length),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/cataluna');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/d/cataluna/barcelona');
  });
});
