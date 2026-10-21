import { beforeEach, expect, it, vi } from 'vitest';
import { run, dossier } from '@/tests/fixtures/blog-research';
import { context } from '@/tests/fixtures/blog-selection';
const mocks = vi.hoisted(() => ({getRun:vi.fn(),eventSlugs:vi.fn()}));
vi.mock('@/lib/db/blog-research',() => ({getRun:mocks.getRun}));
vi.mock('@/lib/db/blog-events',() => ({eventSlugs:mocks.eventSlugs}));
import { fromResearch } from './blog-writing-context';
import { prepare } from '@/lib/blog/writing/context';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getRun.mockResolvedValue({...run,status:'completed',results:context.events.map(event => ({eventId:event.id,eventName:event.name,status:'completed',dossier,consultedSources:[dossier.sources[0].url]}))});
  mocks.eventSlugs.mockResolvedValue(context.events.map(({id,slug}) => ({id,slug})));
});
it('builds context from saved names and dossiers plus current slugs only',async() => {
  const request = await fromResearch(run.id);
  expect(mocks.eventSlugs).toHaveBeenCalledWith(context.events.map(event => event.id));
  expect(request.regionId).toBe('catalonia');expect(request.events).toHaveLength(5);
  expect(prepare(request).input.events[0]).toEqual({eventName:context.events[0].name,dossier});
  expect(JSON.stringify(prepare(request).input)).not.toMatch(/catalog|slug|eventId|regionId|position/);
});
it.each(['queued','running','partial','failed'])('rejects %s research before looking up slugs',async status => {
  mocks.getRun.mockResolvedValue({...run,status});await expect(fromResearch(run.id)).rejects.toMatchObject({code:'invalid_context'});expect(mocks.eventSlugs).not.toHaveBeenCalled();
});
it('rejects incomplete or missing dossiers',async() => {
  const value = await mocks.getRun();value.results[0].dossier=null;
  await expect(fromResearch(run.id)).rejects.toMatchObject({code:'invalid_context'});expect(mocks.eventSlugs).not.toHaveBeenCalled();
});
it.each([[],[{id:context.events[0].id,slug:''}]].map(slugs => [slugs]))('rejects missing events or slugs %#',async slugs => {
  mocks.eventSlugs.mockResolvedValue(slugs);await expect(fromResearch(run.id)).rejects.toMatchObject({code:'invalid_context'});
});
