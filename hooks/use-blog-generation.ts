'use client';
import { useEffect, useRef, useState } from 'react';
import { generateDraft } from '@/lib/api/blog-drafts';
import type { SelectedEvent } from '@/types/blog-selection.types';
import type { DraftDetail, DraftInput } from '@/types/blog-draft-record.types';

export function useBlogGeneration() {
  const [regionId, setRegionId] = useState('');
  const [selected, setSelected] = useState<SelectedEvent[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const [accepted, setAccepted] = useState<DraftDetail | null>(null);
  function setRegion(value: string) { setRegionId(value); setSelected([]); setRequestFailed(false); }
  const submitting = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(input: DraftInput) {
    if (submitting.current) return;
    submitting.current = true;
    const request = new AbortController();
    controller.current = request;
    setIsSubmitting(true); setRequestFailed(false);
    try {
      const draft = await generateDraft(input, request.signal);
      if (!request.signal.aborted) { setAccepted(draft); setSelected([]); }
    } catch {
      if (!request.signal.aborted) setRequestFailed(true);
    } finally {
      submitting.current = false;
      if (!request.signal.aborted) setIsSubmitting(false);
    }
  }
  return { regionId, setRegion, selected, setSelected, isSubmitting, requestFailed, accepted,
    acceptedId: accepted?.id, submit, clearRequestError: () => setRequestFailed(false) };
}
