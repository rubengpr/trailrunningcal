'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TrailRace } from '@/types/race.types';
import type { RaceMapMarker } from '@/types/map.types';
import { filterHomeRaces, filterMapMarkersByRaceIds } from '@/lib/home-race-filters';

interface FilterStorageKeys {
  month: string;
  province: string;
  distance: string;
  type: string;
}

interface PersistenceConfig {
  enabled?: boolean;
  keys?: Partial<FilterStorageKeys>;
}

interface ApplyFiltersPayload {
  month: string[];
  province: string[];
  distance: string[];
  raceType: string[];
}

interface FilterAnalyticsCallbacks {
  onMonthSelect?: (month: string[]) => void;
  onProvinceSelect?: (province: string[]) => void;
  onDistanceSelect?: (distance: string[]) => void;
  onRaceTypeSelect?: (raceType: string[]) => void;
  onClearFilters?: () => void;
  onApplyFilters?: (payload: ApplyFiltersPayload) => void;
}

interface UseRaceFiltersParams {
  races: TrailRace[];
  markers: RaceMapMarker[];
  persistence?: PersistenceConfig;
  analytics?: FilterAnalyticsCallbacks;
}

const DEFAULT_FILTER_STORAGE_KEYS: FilterStorageKeys = {
  month: 'filter_month',
  province: 'filter_province',
  distance: 'filter_distance',
  type: 'filter_type',
};

const readStorageValues = (key: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export function useRaceFilters({
  races,
  markers,
  persistence,
  analytics,
}: UseRaceFiltersParams) {
  const persistenceEnabled = persistence?.enabled ?? true;
  const storageKeys: FilterStorageKeys = {
    month: persistence?.keys?.month ?? DEFAULT_FILTER_STORAGE_KEYS.month,
    province: persistence?.keys?.province ?? DEFAULT_FILTER_STORAGE_KEYS.province,
    distance: persistence?.keys?.distance ?? DEFAULT_FILTER_STORAGE_KEYS.distance,
    type: persistence?.keys?.type ?? DEFAULT_FILTER_STORAGE_KEYS.type,
  };

  const [selectedMonth, setSelectedMonth] = useState<string[]>(() =>
    persistenceEnabled ? readStorageValues(storageKeys.month) : [],
  );
  const [selectedProvince, setSelectedProvince] = useState<string[]>(() =>
    persistenceEnabled ? readStorageValues(storageKeys.province) : [],
  );
  const [selectedDistance, setSelectedDistance] = useState<string[]>(() =>
    persistenceEnabled ? readStorageValues(storageKeys.distance) : [],
  );
  const [selectedRaceType, setSelectedRaceType] = useState<string[]>(() =>
    persistenceEnabled ? readStorageValues(storageKeys.type) : [],
  );

  useEffect(() => {
    if (!persistenceEnabled || typeof window === 'undefined') return;
    sessionStorage.setItem(storageKeys.month, JSON.stringify(selectedMonth));
    sessionStorage.setItem(storageKeys.province, JSON.stringify(selectedProvince));
    sessionStorage.setItem(storageKeys.distance, JSON.stringify(selectedDistance));
    sessionStorage.setItem(storageKeys.type, JSON.stringify(selectedRaceType));
  }, [
    persistenceEnabled,
    selectedMonth,
    selectedProvince,
    selectedDistance,
    selectedRaceType,
    storageKeys.month,
    storageKeys.province,
    storageKeys.distance,
    storageKeys.type,
  ]);

  const filteredRaces = useMemo(
    () => filterHomeRaces(races, selectedMonth, selectedProvince, selectedDistance, selectedRaceType),
    [races, selectedMonth, selectedProvince, selectedDistance, selectedRaceType],
  );

  const filteredMarkers = useMemo(() => {
    const ids = new Set(filteredRaces.map((race) => race.id));
    return filterMapMarkersByRaceIds(markers, ids);
  }, [markers, filteredRaces]);

  const activeFiltersCount = useMemo(
    () =>
      selectedMonth.length +
      selectedProvince.length +
      selectedDistance.length +
      selectedRaceType.length,
    [selectedMonth, selectedProvince, selectedDistance, selectedRaceType],
  );

  const handleMonthSelect = useCallback((month: string[]) => {
    setSelectedMonth(month);
    analytics?.onMonthSelect?.(month);
  }, [analytics]);

  const handleProvinceSelect = useCallback((province: string[]) => {
    setSelectedProvince(province);
    analytics?.onProvinceSelect?.(province);
  }, [analytics]);

  const handleDistanceSelect = useCallback((distance: string[]) => {
    setSelectedDistance(distance);
    analytics?.onDistanceSelect?.(distance);
  }, [analytics]);

  const handleRaceTypeSelect = useCallback((raceType: string[]) => {
    setSelectedRaceType(raceType);
    analytics?.onRaceTypeSelect?.(raceType);
  }, [analytics]);

  const handleClearFilters = useCallback(() => {
    setSelectedMonth([]);
    setSelectedProvince([]);
    setSelectedDistance([]);
    setSelectedRaceType([]);
    analytics?.onClearFilters?.();
  }, [analytics]);

  const handleFiltersApply = useCallback((month: string[], province: string[], distance: string[], raceType: string[]) => {
    setSelectedMonth(month);
    setSelectedProvince(province);
    setSelectedDistance(distance);
    setSelectedRaceType(raceType);
    analytics?.onApplyFilters?.({ month, province, distance, raceType });
  }, [analytics]);

  return {
    selectedMonth,
    selectedProvince,
    selectedDistance,
    selectedRaceType,
    setSelectedMonth,
    setSelectedProvince,
    setSelectedDistance,
    setSelectedRaceType,
    activeFiltersCount,
    filteredRaces,
    filteredMarkers,
    handleMonthSelect,
    handleProvinceSelect,
    handleDistanceSelect,
    handleRaceTypeSelect,
    handleClearFilters,
    handleFiltersApply,
  };
}
