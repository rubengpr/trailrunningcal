export type TerrainAutoLoadReason =
  | 'eligible'
  | 'disabled'
  | 'save-data'
  | 'constrained-network'
  | 'constrained-device'
  | 'insufficient-signals';

interface TerrainConnectionHints {
  effectiveType?: string;
  saveData?: boolean;
}

interface TerrainDeviceHints {
  connection?: TerrainConnectionHints;
  deviceMemory?: number;
}

export interface TerrainAutoLoadDecision {
  enabled: boolean;
  reason: TerrainAutoLoadReason;
}

const CONSTRAINED_CONNECTION_TYPES = new Set(['slow-2g', '2g', '3g']);
const MAX_CONSTRAINED_DEVICE_MEMORY_GB = 2;

export function getTerrainAutoLoadDecision({
  connection,
  deviceMemory,
}: TerrainDeviceHints): TerrainAutoLoadDecision {
  if (connection?.saveData) return { enabled: false, reason: 'save-data' };
  if (
    connection?.effectiveType &&
    CONSTRAINED_CONNECTION_TYPES.has(connection.effectiveType)
  ) {
    return { enabled: false, reason: 'constrained-network' };
  }
  if (
    deviceMemory !== undefined &&
    deviceMemory <= MAX_CONSTRAINED_DEVICE_MEMORY_GB
  ) {
    return { enabled: false, reason: 'constrained-device' };
  }
  if (connection?.effectiveType !== '4g' || deviceMemory === undefined) {
    return { enabled: false, reason: 'insufficient-signals' };
  }
  return { enabled: true, reason: 'eligible' };
}

export function isTerrainAutoLoadPreviewEnabled(): boolean {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).get('event-map-3d') === 'auto';
}

export function getBrowserTerrainAutoLoadDecision(): TerrainAutoLoadDecision {
  if (!isTerrainAutoLoadPreviewEnabled()) {
    return { enabled: false, reason: 'disabled' };
  }

  const navigatorWithHints = navigator as Navigator & TerrainDeviceHints;
  return getTerrainAutoLoadDecision({
    connection: navigatorWithHints.connection,
    deviceMemory: navigatorWithHints.deviceMemory,
  });
}
