import type { LineString, MultiLineString } from 'geojson';

export interface TrackStage {
  name: string | null;
  segmentIndex: number;
  segmentCount: number;
}

export type TrackGeometry = (LineString | MultiLineString) & {
  stages?: TrackStage[];
};
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

export interface TrackProcessingSummary {
  geometryType: TrackGeometry['type'];
  pointCount: number;
  preSimplificationSizeBytes: number;
  removedPointCount: number;
  segmentCount: number;
  simplified: boolean;
  sourcePointCount: number;
  sourceSizeBytes: number;
  normalizedSizeBytes: number;
  targetMet: boolean;
  toleranceMeters: number | null;
}

export interface RaceTrackImportResult extends TrackProcessingSummary {
  mode: TrackImportMode;
  raceId: string;
  eventSlug: string;
}

export interface RaceTrackSaveInput {
  raceId: string;
  bytes: Uint8Array;
}

export interface RaceTrackSaveResult extends TrackProcessingSummary {
  raceId: string;
  eventSlug: string;
}
