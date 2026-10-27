'use client';
import { requestResearch } from '@/lib/api/blog-research';
import type { ResearchRun } from '@/types/blog-research.types';
import { useEffect, useRef, useState } from 'react';
import { generateDraft } from '@/lib/api/blog-drafts';
import type { SelectedEvent, SelectionInput } from '@/types/blog-selection.types';
import type { DraftListItem, DraftInput } from '@/types/blog-draft-record.types';

export function useBlogGeneration() {
  const [regionId, setRegionId] = useState('');
  const [selected, setSelected] = useState<SelectedEvent[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const [researchAccepted, setResearchAccepted] = useState<ResearchRun | null>(null);
  const [accepted, setAccepted] = useState<DraftListItem | null>(null);
  function setRegion(value: string) { setRegionId(value); setSelected([]); setRequestFailed(false); }
  const submitting = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function send<T>(requestValue: (signal: AbortSignal) => Promise<T>, accept: (value: T) => void) {
    if (submitting.current) return;
    submitting.current = true;
    const request = new AbortController();
    controller.current = request;
    setIsSubmitting(true); setRequestFailed(false);
    try {
      const value = await requestValue(request.signal);
      if (!request.signal.aborted) { accept(value); setSelected([]); }
    } catch {
      if (!request.signal.aborted) setRequestFailed(true);
    } finally {
      submitting.current = false;
      if (!request.signal.aborted) setIsSubmitting(false);
    }
  }
  return { regionId, setRegion, selected, setSelected, isSubmitting, requestFailed, accepted,
    acceptedId: accepted?.id, submit: (input: DraftInput) => send(signal => generateDraft(input,signal),setAccepted),
    researchAccepted, submitResearch: (input: SelectionInput) => send(signal => requestResearch(input,signal),setResearchAccepted), clearRequestError: () => setRequestFailed(false) };
}
