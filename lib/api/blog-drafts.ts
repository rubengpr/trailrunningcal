import type { DraftDetail, DraftInput, DraftPage } from '@/types/blog-draft-record.types';

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body.data as T;
}

export async function listDrafts(page = 1, signal?: AbortSignal): Promise<DraftPage> {
  return readResponse<DraftPage>(await fetch(`/api/blog-drafts?page=${page}`, { cache: 'no-store', signal }));
}

export async function getDraft(id: string, signal?: AbortSignal): Promise<DraftDetail> {
  return readResponse<DraftDetail>(await fetch(`/api/blog-drafts/${encodeURIComponent(id)}`, { cache: 'no-store', signal }));
}

export async function generateDraft(input: DraftInput, signal?: AbortSignal): Promise<DraftDetail> {
  return readResponse<DraftDetail>(await fetch('/api/blog-drafts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal,
  }));
}

export async function evaluateDraft(id: string, signal?: AbortSignal): Promise<DraftDetail> {
  return readResponse<DraftDetail>(await fetch(`/api/blog-drafts/${encodeURIComponent(id)}/evaluation`,{method:'POST',signal}));
}
