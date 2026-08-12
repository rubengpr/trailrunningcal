import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  in: vi.fn(),
  getPendingDraftsByEventIds: vi.fn(),
  getTrackedRaceIdsByEventIds: vi.fn(),
}));

vi.mock('react', () => ({ cache: <T>(callback: T): T => callback }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({ in: mocks.in }),
    }),
  }),
  createClient: vi.fn(),
  createStaticClient: vi.fn(),
}));
vi.mock('@/lib/db/event-drafts', () => ({
  getPendingDraftsByEventIds: mocks.getPendingDraftsByEventIds,
}));
vi.mock('@/lib/db/race-tracks', () => ({
  getTrackedRaceIdsByEventIds: mocks.getTrackedRaceIdsByEventIds,
}));

import { getAdminEventsPage } from '@/lib/db/events';

const FIRST_ID = '7a0a4eb8-e4a4-4e8d-8d0c-1d0ed0e2cf11';
const SECOND_ID = '94e16324-c0cd-4f29-a43b-d09830c874a2';

function eventRow(id: string, name: string) {
  return {
    id,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    website_url: null,
    organizer_id: null,
    description: null,
    hero_image_filename: null,
    updated_at: null,
    races: [],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getAdminEventsPage', () => {
  it('loads only the selected IDs and restores database ordering', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ event_ids: [SECOND_ID, FIRST_ID], total_count: '125' }],
      error: null,
    });
    mocks.in.mockResolvedValue({
      data: [eventRow(FIRST_ID, 'First'), eventRow(SECOND_ID, 'Second')],
      error: null,
    });
    mocks.getPendingDraftsByEventIds.mockResolvedValue([]);
    mocks.getTrackedRaceIdsByEventIds.mockResolvedValue(
      new Map([[FIRST_ID, ['race-1']]]),
    );

    const result = await getAdminEventsPage({
      page: 2,
      search: 'trail',
      sortColumn: 'name',
      sortDirection: 'desc',
    });

    expect(mocks.rpc).toHaveBeenCalledWith('get_admin_events_page', {
      p_limit: 50,
      p_offset: 50,
      p_search: 'trail',
      p_sort_column: 'name',
      p_sort_direction: 'desc',
    });
    expect(mocks.in).toHaveBeenCalledWith('id', [SECOND_ID, FIRST_ID]);
    expect(mocks.getPendingDraftsByEventIds).toHaveBeenCalledWith([
      SECOND_ID,
      FIRST_ID,
    ]);
    expect(result.events.map(({ event }) => event.id)).toEqual([
      SECOND_ID,
      FIRST_ID,
    ]);
    expect(result.events[0].trackedRaceIds).toEqual([]);
    expect(result.events[1].trackedRaceIds).toEqual(['race-1']);
    expect(result.totalPages).toBe(3);
  });

  it('does not request details for an empty page', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ event_ids: [], total_count: 0 }],
      error: null,
    });

    const result = await getAdminEventsPage({
      page: 1,
      search: 'missing',
      sortColumn: 'dates',
      sortDirection: 'asc',
    });

    expect(result.events).toEqual([]);
    expect(result.totalPages).toBe(0);
    expect(mocks.in).not.toHaveBeenCalled();
    expect(mocks.getPendingDraftsByEventIds).not.toHaveBeenCalled();
    expect(mocks.getTrackedRaceIdsByEventIds).not.toHaveBeenCalled();
  });

  it('surfaces database failures', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'failed' } });

    await expect(getAdminEventsPage({
      page: 1,
      search: '',
      sortColumn: 'dates',
      sortDirection: 'asc',
    })).rejects.toThrow('Failed to fetch admin event page');
  });
});
