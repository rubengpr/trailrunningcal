// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { TrailEventRace } from '@/types/event.types';
import { EventDistanceList } from './event-distance-list';

afterEach(cleanup);

function race(overrides: Partial<TrailEventRace> = {}): TrailEventRace {
  return {
    id: 'race-1',
    name: 'Garmin Epic Trail Marathon',
    date: '2026-06-27',
    distanceKm: 42,
    elevationGainM: 2800,
    city: 'Vall de Boí',
    province: 'Lleida',
    mapUrl: null,
    tiers: [],
    ...overrides,
  };
}

describe('EventDistanceList', () => {
  it('renders each race name with its distance details', async () => {
    render(
      await EventDistanceList({
        eventName: 'Garmin Epic Trail',
        races: [race()],
        locale: 'es',
        ratioTooltip: 'Elevation per kilometer',
      }),
    );

    expect(
      screen.getByRole('heading', { name: 'Garmin Epic Trail Marathon' }),
    ).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getAllByText('2800 m').length).toBeGreaterThan(0);
  });

  it('uses the event name and distance when the race has no name', async () => {
    render(
      await EventDistanceList({
        eventName: 'Garmin Epic Trail',
        races: [race(), race({ id: 'race-2', name: null })],
        locale: 'es',
        ratioTooltip: 'Elevation per kilometer',
      }),
    );

    expect(screen.getAllByRole('heading')).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: 'Garmin Epic Trail - 42 km' }),
    ).toBeTruthy();
    expect(screen.getAllByText('42')).toHaveLength(2);
  });
});
