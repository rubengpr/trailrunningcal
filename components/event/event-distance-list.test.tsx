// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import type { TrailEventRace } from '@/types/event.types';
import { EventDistanceList } from './event-distance-list';

afterEach(cleanup);

const messages = {
  event: {
    pricing: {
      free: 'Gratis',
      until: 'hasta el {date}',
    },
  },
};

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

async function renderList(races: TrailEventRace[]) {
  const list = EventDistanceList({
    eventName: 'Garmin Epic Trail',
    races,
    locale: 'es',
    ratioTooltip: 'Elevation per kilometer',
  });

  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {list}
    </NextIntlClientProvider>,
  );
}

describe('EventDistanceList', () => {
  it('renders each race name with its distance details', async () => {
    await renderList([race()]);

    expect(
      screen.getByRole('heading', { name: 'Garmin Epic Trail Marathon' }),
    ).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getAllByText('2800 m').length).toBeGreaterThan(0);
  });

  it('uses the event name and distance when the race has no name', async () => {
    await renderList([race(), race({ id: 'race-2', name: null })]);

    expect(screen.getAllByRole('heading')).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: 'Garmin Epic Trail - 42 km' }),
    ).toBeTruthy();
    expect(screen.getAllByText('42')).toHaveLength(2);
  });

  it('renders pricing badges below race names without changing metrics', async () => {
    await renderList([
      race({
        tiers: [{ endsAt: null, priceEur: 35 }],
      }),
      race({
        distanceKm: 21,
        elevationGainM: 1200,
        id: 'race-2',
        name: 'Garmin Epic Trail Half',
        tiers: [{ endsAt: null, priceEur: 0 }],
      }),
    ]);

    const marathon = screen
      .getByRole('heading', { name: 'Garmin Epic Trail Marathon' })
      .closest('article');
    const half = screen
      .getByRole('heading', { name: 'Garmin Epic Trail Half' })
      .closest('article');

    expect(marathon?.textContent).toContain('35');
    expect(marathon?.textContent).toContain('42');
    expect(marathon?.textContent).toContain('2800 m');
    expect(
      marathon
        ?.querySelector('[data-testid="race-price"]')
        ?.closest('[data-testid="race-metrics"]'),
    ).toBeNull();
    expect(half?.textContent).toContain('Gratis');
    expect(half?.textContent).toContain('21');
    expect(half?.textContent).toContain('1200 m');
    expect(
      half
        ?.querySelector('[data-testid="race-price"]')
        ?.closest('[data-testid="race-metrics"]'),
    ).toBeNull();
  });
});
