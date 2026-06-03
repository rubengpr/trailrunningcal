import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'favEvents';

interface UseEventFavoritesReturn {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export function useEventFavorites(): UseEventFavoritesReturn {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          setFavorites(new Set(parsed));
        }
      } catch {
        // ignore parse errors
      }
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.has(id),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite };
}
