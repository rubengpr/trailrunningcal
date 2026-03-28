'use client';

import { useEffect, useState } from 'react';

/** Tailwind `lg` breakpoint — map split only at this width and above. */
export const MIN_WIDTH_LG_PX = 1024;

/**
 * Returns true when viewport is at least `lg` (1024px). First client paint is false until `useEffect` runs.
 */
export function useMinWidthLg(): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MIN_WIDTH_LG_PX}px)`);
    const handler = (): void => {
      setMatches(mq.matches);
    };
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return matches;
}
