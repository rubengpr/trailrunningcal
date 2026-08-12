import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  not: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: mocks.createAdminClient,
}));

import {
  findRaceTrackTargetById,
  getTrackedRaceIdsForEvent,
} from '@/lib/db/race-tracks';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createAdminClient.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq, in: mocks.in });
  mocks.in.mockReturnValue({ not: mocks.not });
  mocks.eq.mockReturnValue({
    not: mocks.not,
    maybeSingle: mocks.maybeSingle,
  });
});

describe('getTrackedRaceIdsForEvent', () => {
  it('selects only IDs for races with stored geometry', async () => {
    mocks.not.mockResolvedValue({
      data: [{ id: 'race-1' }, { id: 'race-2' }],
      error: null,
    });

    await expect(getTrackedRaceIdsForEvent('event-1')).resolves.toEqual([
      'race-1',
      'race-2',
    ]);
    expect(mocks.select).toHaveBeenCalledWith('id');
    expect(mocks.eq).toHaveBeenCalledWith('event_id', 'event-1');
    expect(mocks.not).toHaveBeenCalledWith('track_geometry', 'is', null);
  });

  it('surfaces database failures', async () => {
    mocks.not.mockResolvedValue({ data: null, error: { message: 'failed' } });

    await expect(getTrackedRaceIdsForEvent('event-1')).rejects.toThrow(
      'Failed to load event track statuses',
    );
  });
});

describe('getTrackedRaceIdsByEventIds', () => {
  it('groups only tracked race IDs by event', async () => {
    const { getTrackedRaceIdsByEventIds } = await import('@/lib/db/race-tracks');
    mocks.not.mockResolvedValue({
      data: [
        { id: 'race-1', event_id: 'event-1' },
        { id: 'race-2', event_id: 'event-1' },
        { id: 'race-3', event_id: 'event-2' },
      ],
      error: null,
    });

    const result = await getTrackedRaceIdsByEventIds(['event-1', 'event-2']);

    expect(mocks.select).toHaveBeenCalledWith('id, event_id');
    expect(mocks.in).toHaveBeenCalledWith('event_id', ['event-1', 'event-2']);
    expect(result).toEqual(new Map([
      ['event-1', ['race-1', 'race-2']],
      ['event-2', ['race-3']],
    ]));
  });

  it('skips the database for an empty event page', async () => {
    const { getTrackedRaceIdsByEventIds } = await import('@/lib/db/race-tracks');

    await expect(getTrackedRaceIdsByEventIds([])).resolves.toEqual(new Map());
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
});

describe('findRaceTrackTargetById', () => {
  it('derives the event slug from the selected race ID', async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({
        data: { id: 'race-1', event_id: 'event-1' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { slug: 'pedraforca-xtrail' },
        error: null,
      });

    await expect(findRaceTrackTargetById('race-1')).resolves.toEqual({
      id: 'race-1',
      eventSlug: 'pedraforca-xtrail',
    });
    expect(mocks.from).toHaveBeenNthCalledWith(1, 'races');
    expect(mocks.from).toHaveBeenNthCalledWith(2, 'events');
    expect(mocks.eq).toHaveBeenNthCalledWith(1, 'id', 'race-1');
    expect(mocks.eq).toHaveBeenNthCalledWith(2, 'id', 'event-1');
  });

  it('returns null when the race does not exist', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(findRaceTrackTargetById('missing')).resolves.toBeNull();
    expect(mocks.from).toHaveBeenCalledOnce();
  });
});
