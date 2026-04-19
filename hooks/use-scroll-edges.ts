'use client';

import { useState, useEffect, type RefObject } from 'react';

interface ScrollEdges {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

export function useScrollEdges(ref: RefObject<HTMLDivElement | null>, enabled: boolean): ScrollEdges {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener('scroll', update);
    return () => el.removeEventListener('scroll', update);
  }, [ref, enabled]);

  return { canScrollLeft, canScrollRight };
}
