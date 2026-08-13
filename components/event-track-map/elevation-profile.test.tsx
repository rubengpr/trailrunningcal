// @vitest-environment jsdom

import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ElevationProfileChart } from '@/components/event-track-map/elevation-profile';
import { buildElevationProfiles } from '@/lib/race-tracks/elevation-profile';
import type {
  ElevationProfile,
  ElevationProfileCursorPoint,
  TrackRoute,
} from '@/types/race-track.types';

function route(id: string, distanceDegrees: number, elevations: number[]): TrackRoute {
  return {
    id,
    raceIds: [id],
    raceNames: [id === 'long' ? 'Marató' : 'Trail curt'],
    distanceKm: 42,
    color: id === 'long' ? '#dc2626' : '#15803d',
    lineWidth: 5,
    lineStyle: 'solid',
    geometry: {
      type: 'LineString',
      coordinates: elevations.map((elevation, index) => [
        1 + (distanceDegrees * index) / (elevations.length - 1),
        42,
        elevation,
      ]),
    },
  };
}

const labels = {
  chartDescription: 'Gráfico del perfil de elevación',
};

function ChartHarness({ profiles }: { profiles: ElevationProfile[] }) {
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? '');
  const [activePoint, setActivePoint] =
    useState<ElevationProfileCursorPoint | null>(null);

  return (
    <ElevationProfileChart
      {...labels}
      activePoint={activePoint}
      profiles={profiles}
      selectedId={selectedId}
      onActivePointChange={setActivePoint}
      onSelectedIdChange={setSelectedId}
    />
  );
}

function setPlotBounds(): HTMLElement {
  const plot = screen.getByTestId('elevation-profile-plot');
  Object.defineProperty(plot, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: 140,
      height: 120,
      left: 20,
      right: 220,
      top: 20,
      width: 200,
      x: 20,
      y: 20,
      toJSON: () => ({}),
    }),
  });
  return plot;
}

afterEach(cleanup);

describe('ElevationProfileChart', () => {
  it('renders a single localized elevation profile', () => {
    render(
      <ChartHarness
        profiles={buildElevationProfiles([
          route('long', 0.2, [800, 1_200, 950]),
        ])}
      />,
    );

    expect(screen.queryByText('Perfil de elevación')).toBeNull();
    expect(screen.queryByText('Altitud · m')).toBeNull();
    expect(screen.queryByText('Distancia')).toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Marató');
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByText('8,3')).toBeNull();
    expect(screen.getByText('17 km')).toBeDefined();
    expect(screen.getByTestId('elevation-profile-plot').className).toContain('w-full');
  });

  it('defaults to the longest profile and switches routes', () => {
    render(
      <ChartHarness
        profiles={buildElevationProfiles([
          route('short', 0.05, [500, 600]),
          route('long', 0.2, [900, 1_500]),
        ])}
      />,
    );

    expect(screen.getByRole('button', { name: 'Marató' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText(labels.chartDescription).className).toContain(
      'event-track-profile-picker',
    );
    expect(screen.getByLabelText(labels.chartDescription).className).toContain(
      '[&::-webkit-scrollbar]:hidden',
    );
    expect(screen.getAllByText('1500').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Trail curt' }));

    expect(screen.getByRole('button', { name: 'Trail curt' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByText('600').length).toBeGreaterThan(0);
  });

  it('shows a synchronized cursor and clears it after mouse leave', () => {
    render(
      <ChartHarness
        profiles={buildElevationProfiles([
          route('long', 0.2, [800, 1_200, 950]),
        ])}
      />,
    );
    const plot = setPlotBounds();

    fireEvent.pointerEnter(plot, { clientX: 120, pointerType: 'mouse' });

    expect(screen.getByTestId('elevation-profile-cursor')).toBeDefined();
    expect(screen.getByTestId('elevation-profile-point')).toBeDefined();
    expect(screen.getByTestId('elevation-profile-tooltip').textContent).toMatch(
      /km · .* m · [+-].*%/,
    );

    fireEvent.pointerLeave(plot, { pointerType: 'mouse' });
    expect(screen.queryByTestId('elevation-profile-tooltip')).toBeNull();
  });

  it('keeps a touch point after release and clears it on outside touch', () => {
    render(
      <ChartHarness
        profiles={buildElevationProfiles([
          route('long', 0.2, [800, 1_200, 950]),
        ])}
      />,
    );
    const plot = setPlotBounds();

    fireEvent.pointerDown(plot, {
      clientX: 80,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(plot, {
      clientX: 160,
      pointerId: 1,
      pointerType: 'touch',
    });
    expect(screen.getByTestId('elevation-profile-tooltip')).toBeDefined();

    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expect(screen.queryByTestId('elevation-profile-tooltip')).toBeNull();
  });

  it('clears the cursor when the selected route changes', () => {
    render(
      <ChartHarness
        profiles={buildElevationProfiles([
          route('long', 0.2, [800, 1_200, 950]),
          route('short', 0.1, [500, 700, 550]),
        ])}
      />,
    );
    const plot = setPlotBounds();
    fireEvent.pointerEnter(plot, { clientX: 120, pointerType: 'mouse' });
    expect(screen.getByTestId('elevation-profile-tooltip')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Trail curt' }));
    expect(screen.queryByTestId('elevation-profile-tooltip')).toBeNull();
  });

  it('renders nothing when no route has enough elevation data', () => {
    const withoutElevation = route('short', 0.1, [500, 600]);
    withoutElevation.geometry = {
      type: 'LineString',
      coordinates: [[1, 42], [1.1, 42]],
    };
    const { container } = render(
      <ChartHarness profiles={buildElevationProfiles([withoutElevation])} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
