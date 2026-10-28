'use client';
import { useRef, useState } from 'react';
import { PublicationError } from '@/lib/api/blog-publication';
import type { Publication } from '@/types/blog-publication.types';

export function useBlogPublication(onSaved: (value: Publication) => void) {
  const lock = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(operation: () => Promise<Publication>): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true; setSending(true); setError(null);
    try { onSaved(await operation()); return true; }
    catch (error) {
      const known = ['invalid_author', 'invalid_date', 'invalid_alt', 'invalid_image', 'image_too_large', 'publication_conflict'];
      setError(error instanceof PublicationError && known.includes(error.code) ? error.code : 'save_failed');
      return false;
    } finally { lock.current = false; setSending(false); }
  }
  return { sending, error, submit, setError };
}
