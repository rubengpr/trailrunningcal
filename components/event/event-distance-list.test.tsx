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
    priceEur: null,
    ...overrides,
  };
}

describe('EventDistanceList', () => {
  it('renders each race name with its distance details', async () => {
    render(await EventDistanceList({ races: [race()], locale: 'es' }));

    expect(
      screen.getByRole('heading', { name: 'Garmin Epic Trail Marathon' }),
    ).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getAllByText('2800 m').length).toBeGreaterThan(0);
  });

  it('keeps unnamed races visible without an empty heading', async () => {
    render(await EventDistanceList({ races: [race({ name: null })], locale: 'es' }));

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText('42')).toBeTruthy();
  });
});
