import type { LineString, MultiLineString } from 'geojson';

export type TrackGeometry = LineString | MultiLineString;
export type TrackImportMode = 'dry-run' | 'apply';
export type TrackEndpointKind = 'start' | 'finish';
export type TrackLineStyle = 'solid' | 'dashed';

export interface TrackRaceInput {
  raceId: string;
  raceName: string;
  distanceKm: number;
  geometry: TrackGeometry;
}

export interface TrackRoute {
  id: string;
  raceIds: string[];
  raceNames: string[];
  distanceKm: number;
  color: string;
  lineWidth: number;
  lineStyle: TrackLineStyle;
  geometry: TrackGeometry;
}

export interface TrackEndpointGroup {
  id: string;
  coordinate: [number, number];
  kinds: TrackEndpointKind[];
  raceNames: string[];
  races: Array<{
    name: string;
    color: string;
  }>;
  color: string;
}

export interface RaceTrackImportInput {
  eventSlug: string;
  raceName: string;
  bytes: Uint8Array;
  mode: TrackImportMode;
}

export interface RaceTrackImportResult {
  mode: TrackImportMode;
  raceId: string;
  eventSlug: string;
  geometryType: TrackGeometry['type'];
  segmentCount: number;
  pointCount: number;
  normalizedSizeBytes: number;
}
