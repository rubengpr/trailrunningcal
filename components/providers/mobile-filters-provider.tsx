'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface MobileFiltersContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  isAvailable: boolean;
  filterCount: number;
  filterVariant: string | boolean | undefined;
  register: () => void;
  unregister: () => void;
  updateFilterCount: (count: number) => void;
  updateFilterVariant: (variant: string | boolean | undefined) => void;
}

const MobileFiltersContext = createContext<MobileFiltersContextValue | null>(null);

export function MobileFiltersProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [filterVariant, setFilterVariant] = useState<string | boolean | undefined>(undefined);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const register = useCallback(() => setIsAvailable(true), []);

  const unregister = useCallback(() => {
    setIsAvailable(false);
    setFilterCount(0);
    setIsOpen(false);
  }, []);

  const updateFilterCount = useCallback((count: number) => setFilterCount(count), []);
  const updateFilterVariant = useCallback((variant: string | boolean | undefined) => setFilterVariant(variant), []);

  return (
    <MobileFiltersContext.Provider
      value={{ isOpen, open, close, isAvailable, filterCount, filterVariant, register, unregister, updateFilterCount, updateFilterVariant }}
    >
      {children}
    </MobileFiltersContext.Provider>
  );
}

const NOOP = () => {};
const NO_FILTERS: MobileFiltersContextValue = {
  isOpen: false,
  open: NOOP,
  close: NOOP,
  isAvailable: false,
  filterCount: 0,
  filterVariant: undefined,
  register: NOOP,
  unregister: NOOP,
  updateFilterCount: NOOP,
  updateFilterVariant: NOOP,
};

export function useMobileFilters(): MobileFiltersContextValue {
  return useContext(MobileFiltersContext) ?? NO_FILTERS;
}
