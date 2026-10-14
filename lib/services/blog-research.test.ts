import { beforeEach, expect, it, vi } from 'vitest';
import { context } from '@/tests/fixtures/blog-selection';
import { run } from '@/tests/fixtures/blog-research';
const mocks = vi.hoisted(() => ({getDraft:vi.fn(),claim:vi.fn(),getRun:vi.fn(),fail:vi.fn(),track:vi.fn(),start:vi.fn()}));
vi.mock('@/lib/db/blog-drafts',() => ({getDraft:mocks.getDraft}));
vi.mock('@/lib/db/blog-research',() => mocks);
vi.mock('workflow/api',() => ({start:mocks.start}));
vi.mock('@/lib/workflows/blog-research',() => ({researchWorkflow:vi.fn()}));
import { request } from './blog-research';
beforeEach(() => {vi.resetAllMocks();mocks.getDraft.mockResolvedValue({status:'completed',generationContext:context});mocks.claim.mockResolvedValue(run.id);mocks.getRun.mockResolvedValue(run);mocks.start.mockResolvedValue({runId:'workflow'});});
it.each([1,2,5])('accepts %s selected events',async(count) => {
  expect(await request(run.draftId,context.events.slice(0,count).map(event => event.id))).toEqual(run);expect(mocks.start).toHaveBeenCalledTimes(1);
});
it.each([[],['unknown'],[context.events[0].id,context.events[0].id],Array.from({length:6},(_,i) => String(i))].map(ids => [ids]))('rejects invalid selection before starting %#',async(ids) => {
  await expect(request(run.draftId,ids)).rejects.toMatchObject({status:422});expect(mocks.start).not.toHaveBeenCalled();expect(mocks.claim).not.toHaveBeenCalled();
});
it('rejects missing and active drafts',async() => {
  mocks.getDraft.mockResolvedValueOnce(null).mockResolvedValueOnce({status:'completed',researchStatus:'running'});
  await expect(request(run.draftId,[context.events[0].id])).rejects.toMatchObject({status:404});
  await expect(request(run.draftId,[context.events[0].id])).rejects.toMatchObject({status:409});expect(mocks.start).not.toHaveBeenCalled();
});
it('releases claim on startup failure',async() => {
  mocks.start.mockRejectedValue(new Error('start'));await expect(request(run.draftId,[context.events[0].id])).rejects.toThrow();
  expect(mocks.fail).toHaveBeenCalledWith(run.id,'start_failed');
});
it('still accepts when tracking fails after startup',async() => {
  const log=vi.spyOn(console,'error').mockImplementation(() => {});mocks.track.mockRejectedValue(new Error('DB'));
  expect(await request(run.draftId,[context.events[0].id])).toEqual(run);expect(mocks.fail).not.toHaveBeenCalled();log.mockRestore();
});
