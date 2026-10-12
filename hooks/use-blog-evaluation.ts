'use client';
import { useEffect, useRef, useState } from 'react';
import { evaluateDraft } from '@/lib/api/blog-drafts';
import type { DraftDetail } from '@/types/blog-draft-record.types';

export function useBlogEvaluation(id:string,onAccepted:(draft:DraftDetail)=>void) {
  const [sending,setSending] = useState(false);
  const [requestFailed,setRequestFailed] = useState(false);
  const active = useRef<AbortController|null>(null);
  useEffect(() => () => active.current?.abort(),[]);
  async function submit() {
    if (active.current) return;
    const request = new AbortController(); active.current = request;
    setSending(true);setRequestFailed(false);
    try {
      const draft = await evaluateDraft(id,request.signal);
      if (!request.signal.aborted) onAccepted(draft);
    } catch { if (!request.signal.aborted) setRequestFailed(true); }
    finally { active.current = null; if (!request.signal.aborted) setSending(false); }
  }
  return {sending,requestFailed,submit};
}
