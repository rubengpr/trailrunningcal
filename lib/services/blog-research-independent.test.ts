import { beforeEach, expect, it, vi } from 'vitest';
import { context } from '@/tests/fixtures/blog-selection';
import { run } from '@/tests/fixtures/blog-research';
const mocks = vi.hoisted(() => ({researchEvents:vi.fn(),getDraft:vi.fn(),createRun:vi.fn(),getRun:vi.fn(),fail:vi.fn(),track:vi.fn(),start:vi.fn(),listRuns:vi.fn()}));
vi.mock('@/lib/db/blog-events',() => ({researchEvents:mocks.researchEvents}));
vi.mock('@/lib/db/blog-drafts',() => ({getDraft:mocks.getDraft}));
vi.mock('@/lib/db/blog-research',() => mocks);
vi.mock('workflow/api',() => ({start:mocks.start}));
vi.mock('@/lib/workflows/blog-research',() => ({researchWorkflow:vi.fn()}));
import { requestSelection, listIndependent } from './blog-research';
const input = {regionId:context.regionId,eventIds:context.events.map(event => event.id)};
beforeEach(() => {
  vi.resetAllMocks();mocks.researchEvents.mockResolvedValue(context.events.map(({id,name}) => ({id,name})));mocks.createRun.mockResolvedValue(run.id);
  mocks.getRun.mockResolvedValue({...run,draftId:null});mocks.start.mockResolvedValue({runId:'workflow'});
});
it('validates the server selection and starts research without reading or creating a draft',async() => {
  expect(await requestSelection(input)).toMatchObject({draftId:null});
  expect(mocks.researchEvents).toHaveBeenCalledWith(input.regionId,input.eventIds);
  expect(mocks.createRun).toHaveBeenCalledWith(context.regionId,context.events.map(({id,name}) => ({id,name})),'openai','gpt-6.1-sol');
  expect(mocks.getDraft).not.toHaveBeenCalled();expect(mocks.start).toHaveBeenCalledTimes(1);
});
it('rejects an ineligible selection before creating a run or starting the agent',async() => {
  mocks.researchEvents.mockRejectedValue(new Error('invalid'));
  await expect(requestSelection(input)).rejects.toThrow('invalid');
  expect(mocks.createRun).not.toHaveBeenCalled();expect(mocks.start).not.toHaveBeenCalled();
});
it('retains a failed run when startup fails',async() => {
  mocks.start.mockRejectedValue(new Error('startup'));
  await expect(requestSelection(input)).rejects.toThrow('startup');expect(mocks.fail).toHaveBeenCalledWith(run.id,'start_failed');
});
it('lists only independent history',async() => {
  await listIndependent(2);expect(mocks.listRuns).toHaveBeenCalledWith(null,2);expect(mocks.getDraft).not.toHaveBeenCalled();
});

it.each([{regionId:'andorra',eventIds:input.eventIds},{...input,eventIds:[]},{...input,eventIds:Array(5).fill(input.eventIds[0])}])('rejects invalid region or IDs before querying events',async(value) => {
  await expect(requestSelection(value)).rejects.toMatchObject({status:422});expect(mocks.researchEvents).not.toHaveBeenCalled();expect(mocks.start).not.toHaveBeenCalled();
});
it('rejects events no longer eligible without starting research',async() => {
  mocks.researchEvents.mockResolvedValue(context.events.slice(0,4));await expect(requestSelection(input)).rejects.toMatchObject({status:422});expect(mocks.start).not.toHaveBeenCalled();
});
