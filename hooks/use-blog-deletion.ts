'use client';
import { useEffect, useRef, useState } from 'react';
import { deleteDraft, DraftRequestError } from '@/lib/api/blog-drafts';

export function useBlogDeletion(id: string, onDeleted: (missing: boolean) => void, onConflict: () => void) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<'failed' | 'processing' | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  function show() { setError(null); setOpen(true); }
  function close() { if (!active.current) setOpen(false); }
  async function submit() {
    if (active.current) return;
    const request = new AbortController(); active.current = request;
    setSending(true); setError(null);
    try {
      await deleteDraft(id, request.signal);
      if (!request.signal.aborted) { setOpen(false); onDeleted(false); }
    } catch (failure) {
      if (request.signal.aborted) return;
      if (failure instanceof DraftRequestError && failure.status === 404) {
        setOpen(false); onDeleted(true);
      } else if (failure instanceof DraftRequestError && failure.status === 409) {
        setError('processing'); onConflict();
      } else setError('failed');
    } finally { active.current = null; if (!request.signal.aborted) setSending(false); }
  }
  return { open, sending, error, show, close, submit };
}
