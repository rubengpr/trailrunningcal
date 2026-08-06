// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicEventDetail } from '@/types/event.types';

const mocks = vi.hoisted(() => ({
  getPublicEventLocations: vi.fn(),
}));

vi.mock('@/lib/api/event-locations', () => ({
  getPublicEventLocations: mocks.getPublicEventLocations,
}));

import { useEventMapLocations } from './use-event-map-locations';

function event(
  id: string,
  city: string,
  province: string,
): PublicEventDetail {
  return {
    event: { id, name: `Event ${id}`, slug: `event-${id}` },
    races: [{
      id: `race-${id}`,
      name: null,
      date: '2027-05-01',
      distanceKm: 21,
      elevationGainM: 900,
      city,
      province,
    }],
    dateRange: { startDate: '2027-05-01', endDate: '2027-05-01' },
    location: {
      city,
      province,
      groups: [{ province, cities: [city] }],
      isMultipleLocations: false,
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(cleanup);

describe('useEventMapLocations', () => {
  it('does not request coordinates until the map is activated', async () => {
    mocks.getPublicEventLocations.mockResolvedValue([{
      city: 'Girona',
      province: 'Girona',
      latitude: 41.98,
      longitude: 2.82,
    }]);
    const events = [event('one', 'Girona', 'Girona')];
    const { result } = renderHook(() =>
      useEventMapLocations(events),
    );

    expect(mocks.getPublicEventLocations).not.toHaveBeenCalled();

    act(() => result.current.activate());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mocks.getPublicEventLocations).toHaveBeenCalledTimes(1);
    expect(result.current.markers).toHaveLength(1);
    expect(result.current.markers[0].events[0].id).toBe('one');
  });

  it('reuses cached coordinates and requests only new event locations', async () => {
    mocks.getPublicEventLocations
      .mockResolvedValueOnce([{
        city: 'Girona',
        province: 'Girona',
        latitude: 41.98,
        longitude: 2.82,
      }])
      .mockResolvedValueOnce([{
        city: 'Barcelona',
        province: 'Barcelona',
        latitude: 41.38,
        longitude: 2.17,
      }]);
    const { result, rerender } = renderHook(
      ({ events }) => useEventMapLocations(events),
      { initialProps: { events: [event('one', 'Girona', 'Girona')] } },
    );

    act(() => result.current.activate());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    rerender({
      events: [
        event('one', 'Girona', 'Girona'),
        event('two', 'Barcelona', 'Barcelona'),
      ],
    });

    await waitFor(() => expect(mocks.getPublicEventLocations).toHaveBeenCalledTimes(2));
    expect(mocks.getPublicEventLocations.mock.calls[1][0]).toEqual([{
      city: 'Barcelona',
      province: 'Barcelona',
    }]);
    await waitFor(() => expect(result.current.markers).toHaveLength(2));
  });

  it('supports retrying a failed coordinate request', async () => {
    mocks.getPublicEventLocations
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce([{
        city: 'Girona',
        province: 'Girona',
        latitude: 41.98,
        longitude: 2.82,
      }]);
    const events = [event('one', 'Girona', 'Girona')];
    const { result } = renderHook(() =>
      useEventMapLocations(events),
    );

    act(() => result.current.activate());
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mocks.getPublicEventLocations).toHaveBeenCalledTimes(2);
  });
});
