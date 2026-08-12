'use client';

import { useEffect, useRef, useState } from 'react';

export function useTerrainSettingsDisclosure(active: boolean) {
  const [requestedOpen, setIsOpen] = useState(false);
  const isOpen = active && requestedOpen;
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  return { isOpen, panelRef, setIsOpen, triggerRef };
}
