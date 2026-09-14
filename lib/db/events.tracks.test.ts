import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createStaticClient: vi.fn(),
  eventSelect: vi.fn(),
  metadataSelect: vi.fn(),
  geometrySelect: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (callback: () => unknown) => callback,
}));
vi.mock('next-intl/server', () => ({
  getTranslations: () => Promise.resolve((key: string) => key),
}));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  createStaticClient: mocks.createStaticClient,
}));
import { getEventTrackRoutes } from '@/lib/db/race-tracks';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.eventSelect.mockReturnValue({
    eq: () => ({
      maybeSingle: () => Promise.resolve({
        data: { id: 'event-1', name: 'Event' },
        error: null,
      }),
    }),
  });
  mocks.metadataSelect.mockReturnValue({
    eq: () => ({
      not: () => Promise.resolve({
        data: [
          { id: 'past', name: 'Past', date: '2025-05-01', distance_km: 25 },
          { id: 'current', name: 'Current', date: '2098-05-01', distance_km: 30 },
          { id: 'future', name: 'Future', date: '2099-05-01', distance_km: 35 },
        ],
        error: null,
      }),
    }),
  });
  mocks.geometrySelect.mockReturnValue({
    in: (_column: string, ids: string[]) => Promise.resolve({
      data: ids.map((id) => ({
        id,
        track_geometry: {
          type: 'LineString',
          coordinates: [[1, 41], [1.1, 41.1]],
        },
      })),
      error: null,
    }),
  });
  mocks.createStaticClient.mockReturnValue({
    from: (table: string) => ({
      select: (columns: string) => {
        if (table === 'events') return mocks.eventSelect(columns);
        return columns === 'id, track_geometry'
          ? mocks.geometrySelect(columns)
          : mocks.metadataSelect(columns);
      },
    }),
  });
});

describe('getEventTrackRoutes', () => {
  it('fetches geometry only for the relevant tracked edition', async () => {
    const routes = await getEventTrackRoutes('event-1', 'en');

    expect(mocks.metadataSelect).toHaveBeenCalledWith(
      'id, name, date, distance_km',
    );
    expect(mocks.geometrySelect).toHaveBeenCalledWith('id, track_geometry');
    expect(routes).toHaveLength(1);
    expect(routes?.[0]?.raceIds).toEqual(['current']);
  });
});
