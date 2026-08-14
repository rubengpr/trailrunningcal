export const MAP_PREVIEW_FEATURE_FLAG_KEY = 'event-track-map-preview-mode';

export type MapPreviewVariant = 'control' | '3d_preview';
export type MapPreviewMode = '2d' | '3d';
export type MapDeviceFormFactor = 'mobile' | 'desktop';

export interface MapExperimentContext {
  device_form_factor: MapDeviceFormFactor;
  feature_flag_variant: MapPreviewVariant;
  requested_preview_mode: MapPreviewMode;
}

export function getMapPreviewVariant(
  value: string | boolean | undefined,
): MapPreviewVariant | undefined {
  if (value === 'control' || value === '3d_preview') return value;
  return undefined;
}

export function getRequestedPreviewMode(
  variant: MapPreviewVariant,
): MapPreviewMode {
  return variant === '3d_preview' ? '3d' : '2d';
}

export function getMapDeviceFormFactor(): MapDeviceFormFactor {
  if (typeof window === 'undefined') return 'desktop';
  return window.matchMedia('(max-width: 639px)').matches
    ? 'mobile'
    : 'desktop';
}
