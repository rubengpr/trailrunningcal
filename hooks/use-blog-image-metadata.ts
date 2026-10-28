'use client';
import { useEffect, useState } from 'react';
import { getImageMetadata } from '@/lib/api/blog-publication';
import type { ImageMetadata } from '@/types/blog-publication.types';

export function useBlogImageMetadata(id: string, path: string | null) {
  const [result, setResult] = useState<{ key: string; data: ImageMetadata | null; failed: boolean } | null>(null);
  const key = `${id}:${path}`;
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    getImageMetadata(id, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ key, data, failed: false });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key, data: null, failed: true });
    });
    return () => controller.abort();
  }, [id, path, key]);
  return result?.key === key ? result : { data: null, failed: false };
}
