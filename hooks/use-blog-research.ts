'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePolledResource } from '@/hooks/use-polled-resource';
import { DraftRequestError, listResearch, researchDraft } from '@/lib/api/blog-drafts';
import type { DraftResearchStatus, ResearchPage } from '@/types/blog-research.types';

export function useBlogResearch(id: string, initial: ResearchPage, active: boolean, onStatusChange: (status: DraftResearchStatus) => void) {
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const load = useCallback((signal: AbortSignal) => listResearch(id,page,signal),[id,page]);
  const resource = usePolledResource(initial,load,value => active || value.runs.some(run => run.status === 'queued' || run.status === 'running'));
  const latestStatus = resource.data.pagination.page === 1 ? resource.data.runs[0]?.status : undefined;
  useEffect(() => { if (latestStatus) onStatusChange(latestStatus); },[latestStatus,onStatusChange]);
  const {refresh} = resource;
  useEffect(() => { void refresh(); },[page,refresh]);

  const submit = async (eventIds: string[]) => {
    if (busy.current || active) return;
    if (!eventIds.length) { setError('selectionRequired'); return; }
    busy.current = true; setSending(true); setError(null);
    try {
      const run = await researchDraft(id,eventIds);
      if (!mounted.current) return;
      resource.update(current => ({
        runs: [run,...(current.pagination.page === 1 ? current.runs : [])].slice(0,50),
        pagination: {page:1,pageSize:50,total:current.pagination.total+1,totalPages:Math.ceil((current.pagination.total+1)/50)},
      }));
      setPage(1); onStatusChange(run.status);
      void resource.refresh();
    } catch (failure) {
      if (!mounted.current) return;
      setError(failure instanceof DraftRequestError && failure.status === 409 ? 'conflict' : 'requestFailed');
      void resource.refresh();
    } finally {
      busy.current = false;
      if (mounted.current) setSending(false);
    }
  };
  return {...resource,page,setPage,sending,error,submit};
}
