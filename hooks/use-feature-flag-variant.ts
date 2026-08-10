'use client';

import { useSyncExternalStore } from 'react';
import { useFeatureFlagVariantKey } from 'posthog-js/react';

const subscribeToHydration = () => () => {};

export function useFeatureFlagVariant(
  key: string,
): string | boolean | undefined {
  const variant = useFeatureFlagVariantKey(key);
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  return hasHydrated ? variant : undefined;
}
