'use client';
import { useEffect, useState } from 'react';
import { listEvents } from '@/lib/api/blog-drafts';
import type { EventSelectionPage } from '@/types/blog-selection.types';

export function useBlogEvents(regionId: string, search: string, page: number) {
  const [data, setData] = useState<EventSelectionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, retry] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    setData(null); setFailed(false); setLoading(Boolean(regionId));
    if (!regionId) return;
    const timer = setTimeout(async () => {
      try {
        const value = await listEvents(regionId, search, page, request.signal);
        if (!request.signal.aborted) setData(value);
      } catch { if (!request.signal.aborted) setFailed(true); }
      finally { if (!request.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); request.abort(); };
  }, [regionId, search, page, attempt]);
  return {data, loading, failed, retry: () => retry(value => value + 1)};
}
