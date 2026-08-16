// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrailEventRace } from '@/types/event.types';
import { EventResultsAccordion } from './event-results-accordion';

const mocks = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('@/lib/analytics/track', () => ({ track: mocks.track }));

afterEach(() => {
  cleanup();
  mocks.track.mockClear();
});

function race(
  id: string,
  name: string,
  distanceKm: number,
  resultsUrl: string | null,
): TrailEventRace {
  return {
    id,
    name,
    date: '2026-08-15',
    distanceKm,
    elevationGainM: 900,
    city: 'Bagà',
    province: 'Barcelona',
    mapUrl: null,
    resultsUrl,
    tiers: [],
  };
}

function renderAccordion(races: TrailEventRace[]) {
  return render(
    <EventResultsAccordion
      eventId="event-1"
      eventSlug="trail-moixero"
      locale="es"
      races={races}
      title="Clasificaciones de Trail Moixeró 2026"
      viewLabel="Ver resultados"
    />,
  );
}

describe('EventResultsAccordion', () => {
  it('renders a fixed card with only modalities that have results', () => {
    const { container } = renderAccordion([
      race('36k', 'Moixeró 36K', 36, 'https://results.example.com/36k'),
      race('12k', 'Strail 12K', 12, 'https://results.example.com/12k'),
      race('4k', 'KV 4K', 4, null),
    ]);

    expect(container.querySelector('section')).toBeTruthy();
    expect(container.querySelector('details')).toBeNull();
    expect(screen.getByText('36 km')).toBeTruthy();
    expect(screen.getByText('12 km')).toBeTruthy();
    expect(screen.queryByText('4 km')).toBeNull();
    expect(screen.queryByText('Moixeró 36K')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('uses secure external links without accordion controls', () => {
    renderAccordion([
      race('36k', 'Moixeró 36K', 36, 'https://results.example.com/36k'),
    ]);
    const link = screen.getByRole('link', { name: /36 km/i });

    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('tracks the selected race and returns nothing without result URLs', () => {
    const { unmount } = renderAccordion([
      race('36k', 'Moixeró 36K', 36, 'https://results.example.com/36k'),
    ]);

    fireEvent.click(screen.getByRole('link'));
    expect(mocks.track).toHaveBeenCalledWith('event_race_results_clicked', {
      event_id: 'event-1',
      event_slug: 'trail-moixero',
      race_id: '36k',
      distance_km: 36,
    });

    unmount();
    const empty = renderAccordion([race('4k', 'KV 4K', 4, null)]);
    expect(empty.container.innerHTML).toBe('');
  });
});
