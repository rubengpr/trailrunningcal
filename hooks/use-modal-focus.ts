'use client';
import { useEffect, useRef } from 'react';

export function useModalFocus() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = container.current;
    (root?.querySelector<HTMLElement>('input,textarea') ?? root?.querySelector('button'))?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = [...root?.querySelectorAll<HTMLElement>('input:not(:disabled),textarea:not(:disabled),button:not(:disabled)') ?? []];
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    root?.addEventListener('keydown', trap);
    return () => { root?.removeEventListener('keydown', trap); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return container;
}
