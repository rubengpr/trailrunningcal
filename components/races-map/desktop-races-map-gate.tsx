'use client';

import type { ReactElement, ReactNode } from 'react';
import { useMinWidthLg } from '@/hooks/use-min-width-lg';

interface DesktopRacesMapGateProps {
  children: ReactNode;
}

/**
 * Renders children only at the `lg` breakpoint and above so MapLibre does not mount on mobile/tablet.
 */
export default function DesktopRacesMapGate({
  children,
}: DesktopRacesMapGateProps): ReactElement | null {
  const showMap = useMinWidthLg();
  if (!showMap) return null;
  return <>{children}</>;
}
