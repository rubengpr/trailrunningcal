import type { ResearchPage, ResearchRun } from '@/types/blog-research.types';
import type { SelectionInput } from '@/types/blog-selection.types';

async function read<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error('Research request failed');
  return (await response.json()).data as T;
}
export async function requestResearch(input: SelectionInput, signal?: AbortSignal): Promise<ResearchRun> {
  return read(await fetch('/api/blog-research', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(input), signal}));
}
export async function listResearch(page: number, signal?: AbortSignal): Promise<ResearchPage> {
  return read(await fetch(`/api/blog-research?page=${page}`, {cache:'no-store', signal}));
}
export async function getResearch(id: string, signal?: AbortSignal): Promise<ResearchRun> {
  return read(await fetch(`/api/blog-research/${encodeURIComponent(id)}`, {cache:'no-store', signal}));
}
