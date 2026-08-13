import { describe, expect, it } from 'vitest';
import {
  buildTrackEndpointGroups,
  buildTrackRoutes,
  toTrackGeometry,
} from '@/lib/race-tracks/routes';

const short = {
  type: 'LineString' as const,
  coordinates: [
    [1.7, 42.2],
    [1.8, 42.3],
  ],
};

describe('track routes', () => {
  it('validates supported stored geometry', () => {
    expect(toTrackGeometry(short)).toEqual(short);
    expect(toTrackGeometry({ type: 'Point', coordinates: [1.7, 42.2] })).toBeNull();
    expect(
      toTrackGeometry({ type: 'LineString', coordinates: [[200, 42], [1, 2]] }),
    ).toBeNull();
  });

  it('validates stored stage metadata and ignores malformed metadata', () => {
    const geometry = {
      type: 'MultiLineString',
      coordinates: [
        [[1.7, 42.2], [1.8, 42.3]],
        [[1.8, 42.3], [1.9, 42.4]],
      ],
      stages: [
        { name: 'ST1', segmentIndex: 0, segmentCount: 1 },
        { name: 'ST2', segmentIndex: 1, segmentCount: 1 },
      ],
    };

    expect(toTrackGeometry(geometry)).toEqual(geometry);
    expect(
      toTrackGeometry({
        ...geometry,
        stages: [{ name: 'Broken', segmentIndex: 1, segmentCount: 2 }],
      }),
    ).toEqual({
      type: 'MultiLineString',
      coordinates: geometry.coordinates,
    });
  });

  it('renders GPX stages as separately colored routes', () => {
    const routes = buildTrackRoutes([
      {
        raceId: 'stage-race',
        raceName: 'Stage race',
        distanceKm: 100,
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[1.7, 42.2], [1.8, 42.3]],
            [[1.8, 42.3], [1.9, 42.4]],
            [[1.9, 42.4], [2, 42.5]],
          ],
          stages: [
            { name: 'ST1: First', segmentIndex: 0, segmentCount: 1 },
            { name: 'ST2: Second', segmentIndex: 1, segmentCount: 2 },
          ],
        },
      },
    ]);

    expect(routes).toMatchObject([
      {
        raceIds: ['stage-race'],
        raceNames: ['ST1: First'],
        color: '#2563eb',
        geometry: { type: 'LineString' },
      },
      {
        raceIds: ['stage-race'],
        raceNames: ['ST2: Second'],
        color: '#ea580c',
        geometry: { type: 'MultiLineString' },
      },
    ]);
  });

  it('sorts routes and keeps identical geometry separate across categories', () => {
    const routes = buildTrackRoutes([
      { raceId: 'short', raceName: 'Short', distanceKm: 10, geometry: short },
      { raceId: 'walk', raceName: 'Caminada', distanceKm: 9, geometry: short },
      {
        raceId: 'long',
        raceName: 'Marató',
        distanceKm: 42,
        geometry: {
          type: 'LineString',
          coordinates: [[1.6, 42.1], [1.9, 42.4]],
        },
      },
    ]);

    expect(routes).toHaveLength(3);
    expect(routes[0]).toMatchObject({
      raceIds: ['long'],
      color: '#dc2626',
      lineWidth: 8,
      lineStyle: 'solid',
    });
    expect(routes[1]).toMatchObject({
      raceIds: ['short'],
      color: '#15803d',
      lineWidth: 4,
      lineStyle: 'solid',
    });
    expect(routes[2]).toMatchObject({
      raceIds: ['walk'],
      color: '#eab308',
      lineWidth: 3,
      lineStyle: 'dashed',
    });
  });

  it('assigns colors by category and groups matching categories', () => {
    const geometry = (offset: number) => ({
      type: 'LineString' as const,
      coordinates: [[1.7 + offset, 42.2], [1.8 + offset, 42.3]],
    });
    const routes = buildTrackRoutes([
      { raceId: 'ultra', raceName: 'Ultra', distanceKm: 50, geometry: geometry(0) },
      { raceId: 'marathon', raceName: 'Marató', distanceKm: 40, geometry: geometry(1) },
      { raceId: 'medium', raceName: 'Trail 21K', distanceKm: 21, geometry: geometry(2) },
      { raceId: 'short', raceName: 'Trail 10K', distanceKm: 10, geometry: geometry(3) },
      { raceId: 'walk', raceName: 'Marxa 30K', distanceKm: 30, geometry: geometry(4) },
      { raceId: 'short-2', raceName: 'Trail 8K', distanceKm: 8, geometry: geometry(3) },
    ]);

    expect(
      routes.map(({ raceIds, color, lineWidth, lineStyle }) => ({
        raceIds,
        color,
        lineWidth,
        lineStyle,
      })),
    ).toEqual([
      { raceIds: ['ultra'], color: '#171717', lineWidth: 10, lineStyle: 'solid' },
      { raceIds: ['marathon'], color: '#dc2626', lineWidth: 8, lineStyle: 'solid' },
      { raceIds: ['medium'], color: '#2563eb', lineWidth: 5.5, lineStyle: 'solid' },
      {
        raceIds: ['short', 'short-2'],
        color: '#15803d',
        lineWidth: 4,
        lineStyle: 'solid',
      },
      { raceIds: ['walk'], color: '#eab308', lineWidth: 3, lineStyle: 'dashed' },
    ]);
  });

  it('uses related secondary colors for distinct routes in one category', () => {
    const geometry = (offset: number) => ({
      type: 'LineString' as const,
      coordinates: [[1.7 + offset, 42.2], [1.8 + offset, 42.3]],
    });

    const routes = buildTrackRoutes([
      { raceId: 'medium-long', raceName: 'Trail 30K', distanceKm: 30, geometry: geometry(0) },
      { raceId: 'medium-short', raceName: 'Trail 22K', distanceKm: 22, geometry: geometry(1) },
      { raceId: 'short-long', raceName: 'Trail 15K', distanceKm: 15, geometry: geometry(2) },
      { raceId: 'short-short', raceName: 'Trail 8K', distanceKm: 8, geometry: geometry(3) },
    ]);

    expect(routes.map(({ raceIds, color }) => ({ raceIds, color }))).toEqual([
      { raceIds: ['medium-long'], color: '#2563eb' },
      { raceIds: ['medium-short'], color: '#7c3aed' },
      { raceIds: ['short-long'], color: '#15803d' },
      { raceIds: ['short-short'], color: '#84cc16' },
    ]);
  });

  it('derives endpoints across segments and groups shared locations', () => {
    const endpoints = buildTrackEndpointGroups([
      {
        id: 'long',
        raceIds: ['long'],
        raceNames: ['Marató'],
        distanceKm: 42,
        color: '#dc2626',
        lineWidth: 8,
        lineStyle: 'solid',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[1.7, 42.2], [1.75, 42.25]],
            [[1.75, 42.25], [1.8, 42.3]],
          ],
        },
      },
      {
        id: 'short',
        raceIds: ['short'],
        raceNames: ['Short'],
        distanceKm: 10,
        color: '#16a34a',
        lineWidth: 4,
        lineStyle: 'solid',
        geometry: {
          type: 'LineString',
          coordinates: [[1.7, 42.2], [1.9, 42.4]],
        },
      },
    ]);

    expect(endpoints).toEqual([
      {
        id: 'endpoint-1',
        coordinate: [1.7, 42.2],
        kinds: ['start'],
        raceNames: ['Marató', 'Short'],
        races: [
          { name: 'Marató', color: '#dc2626' },
          { name: 'Short', color: '#16a34a' },
        ],
        color: '#292524',
      },
      {
        id: 'endpoint-2',
        coordinate: [1.8, 42.3],
        kinds: ['finish'],
        raceNames: ['Marató'],
        races: [{ name: 'Marató', color: '#dc2626' }],
        color: '#dc2626',
      },
      {
        id: 'endpoint-3',
        coordinate: [1.9, 42.4],
        kinds: ['finish'],
        raceNames: ['Short'],
        races: [{ name: 'Short', color: '#16a34a' }],
        color: '#16a34a',
      },
    ]);
  });

  it('collapses a loop into a combined start and finish endpoint', () => {
    expect(
      buildTrackEndpointGroups([
        {
          id: 'loop',
          raceIds: ['loop'],
          raceNames: ['Loop'],
          distanceKm: 10,
          color: '#16a34a',
          lineWidth: 4,
          lineStyle: 'solid',
          geometry: {
            type: 'LineString',
            coordinates: [[1.7, 42.2], [1.8, 42.3], [1.7, 42.2]],
          },
        },
      ]),
    ).toEqual([
      {
        id: 'endpoint-1',
        coordinate: [1.7, 42.2],
        kinds: ['start', 'finish'],
        raceNames: ['Loop'],
        races: [{ name: 'Loop', color: '#16a34a' }],
        color: '#16a34a',
      },
    ]);
  });
});
