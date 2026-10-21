import { getRun } from '@/lib/db/blog-research';
import { eventSlugs } from '@/lib/db/blog-events';
import { prepare, WritingError } from '@/lib/blog/writing/context';
import type { WritingRequest } from '@/types/blog-writing.types';

export async function fromResearch(id: string): Promise<WritingRequest> {
  const run = await getRun(id);
  if (run.status !== 'completed' || run.results.length !== 5 || run.results.some(result => result.status !== 'completed' || !result.dossier)) throw new WritingError('invalid_context');
  const slugs = await eventSlugs(run.results.map(result => result.eventId));
  const events = run.results.map(result => ({eventId:result.eventId,eventName:result.eventName,
    slug:slugs.find(event => event.id === result.eventId)?.slug,dossier:result.dossier,consultedSources:result.consultedSources}));
  return prepare({regionId:run.regionId,events}).request;
}
