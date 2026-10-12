'use client';
import { useEffect, useRef, useState } from 'react';
import { generateDraft } from '@/lib/api/blog-drafts';
import type { DraftDetail } from '@/types/blog-draft-record.types';

export function useBlogGeneration() {
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const [accepted, setAccepted] = useState<DraftDetail | null>(null);
  const submitting = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(input: string) {
    if (submitting.current) return;
    submitting.current = true;
    const request = new AbortController();
    controller.current = request;
    setIsSubmitting(true); setRequestFailed(false);
    try {
      const draft = await generateDraft({ instructions: input }, request.signal);
      if (!request.signal.aborted) { setAccepted(draft); setInstructions(''); }
    } catch {
      if (!request.signal.aborted) setRequestFailed(true);
    } finally {
      submitting.current = false;
      if (!request.signal.aborted) setIsSubmitting(false);
    }
  }
  return { instructions, setInstructions, isSubmitting, requestFailed, accepted,
    acceptedId: accepted?.id, submit, clearRequestError: () => setRequestFailed(false) };
}
