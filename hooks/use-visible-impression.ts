'use client';

import { useEffect, useRef } from 'react';

/** Once per key after 50% visibility for one continuous second in a visible tab. */
export function useVisibleImpression(key: string | null, onVisible: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onVisible);
  useEffect(() => { callbackRef.current = onVisible; }, [onVisible]);

  useEffect(() => {
    const element = ref.current;
    if (!key || !element || !('IntersectionObserver' in window)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inView = false;
    let complete = false;
    const cancel = () => { clearTimeout(timer); timer = undefined; };
    const update = () => {
      cancel();
      if (complete || !inView || document.visibilityState !== 'visible') return;
      timer = setTimeout(() => {
        complete = true;
        callbackRef.current();
        observer.disconnect();
      }, 1000);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.5);
      update();
    }, { threshold: 0.5 });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => {
      cancel();
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [key]);

  return ref;
}
