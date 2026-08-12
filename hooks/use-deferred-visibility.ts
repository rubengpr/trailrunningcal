'use client';

import { useEffect, useRef, useState } from 'react';

interface DeferredVisibilityOptions {
  onVisible?: () => void;
  preload: () => void;
  threshold: number;
}

export function useDeferredVisibility<T extends HTMLElement>({
  onVisible,
  preload,
  threshold,
}: DeferredVisibilityOptions) {
  const [isVisible, setIsVisible] = useState(false);
  const hasActivatedRef = useRef(false);
  const targetRef = useRef<T>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const activate = () => {
      if (hasActivatedRef.current) return;
      hasActivatedRef.current = true;
      preload();
      setIsVisible(true);
      onVisible?.();
    };

    if (typeof IntersectionObserver === 'undefined') {
      const timeoutId = window.setTimeout(activate, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= threshold) {
          activate();
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [onVisible, preload, threshold]);

  return { isVisible, targetRef };
}
