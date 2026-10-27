import { context } from '@/tests/fixtures/blog-selection';
vi.mock('workflow', () => ({ FatalError: class extends Error {}, getWorkflowMetadata: () => ({workflowRunId:'run'}) }));
vi.mock('@/lib/workflows/blog-evaluation', () => ({runEvaluation:vi.fn()}));
import { runEvaluation } from '@/lib/workflows/blog-evaluation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationError } from '@/lib/blog/content';

const mocks = vi.hoisted(() => ({ getDraft: vi.fn(), markRunning: vi.fn(), completeDraft: vi.fn(), markFailed: vi.fn(), generate: vi.fn(), research:vi.fn(), prepareResearch:vi.fn(), fromResearch:vi.fn(), write:vi.fn() }));
vi.mock('@/lib/workflows/blog-research',()=>({prepareStep:mocks.prepareResearch,runResearch:mocks.research}));
vi.mock('@/lib/services/blog-writing-context',()=>({fromResearch:mocks.fromResearch}));
vi.mock('@/lib/services/blog-writing',()=>({write:mocks.write}));
vi.mock('@/lib/db/blog-drafts', () => mocks);
vi.mock('@/lib/services/blog-article', () => ({ generate: mocks.generate }));
const costs = vi.hoisted(() => ({ trackCost: vi.fn(), call: {requestedModel:'gpt-6.1-sol',model:'gpt-6.1-sol',serviceTier:'default',responseId:'response',responseStatus:'completed',usage:{},searchCalls:0} }));
vi.mock('@/lib/workflows/blog-costs', () => ({ trackCost: costs.trackCost }));
vi.mock('@/lib/services/blog-costs', () => ({ tracker: () => ({ observe: vi.fn(), call: () => costs.call }) }));
import { articleWorkflow, generateStep, saveStep, writeStep } from './blog-article';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.completeDraft.mockResolvedValue('attempt');
  mocks.getDraft.mockResolvedValue({ instructions: 'Test instructions' });
  mocks.generate.mockResolvedValue({ article: { title: 'Article' }, contentHtml: '<p>Text</p>' });
});
describe('blog workflow', () => {
  it('generates and persists once', async () => {
    await articleWorkflow({ id: 'id' });
    expect(mocks.markRunning).toHaveBeenCalledWith('id');
    expect(mocks.generate).toHaveBeenCalledWith('Test instructions', undefined, expect.any(Function));
    expect(mocks.completeDraft).toHaveBeenCalledTimes(1);
    expect(runEvaluation).toHaveBeenCalledWith('id','run','attempt');
    expect(mocks.markFailed).not.toHaveBeenCalled();
  });
  it.each(['refused', 'incomplete', 'invalid_content', 'timeout', 'api_error'] as const)('persists safe failure %s', async code => {
    mocks.generate.mockRejectedValue(new GenerationError(code));
    await expect(articleWorkflow({ id: 'id' })).rejects.toThrow(code);
    expect(mocks.markFailed).toHaveBeenCalledWith('id', code);
    expect(mocks.completeDraft).not.toHaveBeenCalled();
  });
  it('evaluation failure does not mark the article as failed', async () => {
    vi.mocked(runEvaluation).mockRejectedValueOnce(new Error('scorer failed'));
    await expect(articleWorkflow({id:'id'})).rejects.toThrow('scorer failed');
    expect(mocks.markFailed).not.toHaveBeenCalled();
    expect(mocks.completeDraft).toHaveBeenCalledTimes(1);
  });
  it('saving again never regenerates content', async () => {
    const generated = await generateStep('Test instructions');
    if (!generated.result) throw new Error('Missing result');
    await saveStep('id', generated.result);
    await saveStep('id', generated.result);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(generateStep.maxRetries).toBe(0);
  });
  it('marks save errors without another model call', async () => {
    mocks.completeDraft.mockRejectedValue(new Error('private DB details'));
    await expect(articleWorkflow({ id: 'id' })).rejects.toThrow('save_failed');
    expect(mocks.markFailed).toHaveBeenCalledWith('id', 'save_failed');
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
});

it('generates from the persisted selection without rereading events', async () => {
  mocks.getDraft.mockResolvedValue({instructions: 'Encargo autonómico', generationContext: context});
  await articleWorkflow({id: 'id'});
  expect(mocks.generate).toHaveBeenCalledWith('Encargo autonómico', context, expect.any(Function));
  expect(mocks.completeDraft).toHaveBeenCalledTimes(1);
});

it('retrying a regional save never repeats the writer or research',async()=>{
  mocks.fromResearch.mockResolvedValue({regionId:'catalonia',events:[{slug:'event',dossier:{}}]});
  mocks.write.mockResolvedValue({article:{title:'Title'},contentHtml:'<p>Saved</p>',references:[]});
  const {result}=await writeStep('research');
  if (!result) throw new Error('Missing result');
  mocks.completeDraft.mockRejectedValueOnce(new Error('temporary write failure')).mockResolvedValueOnce('attempt');
  await expect(saveStep('id',result)).rejects.toThrow('temporary');
  await saveStep('id',result);
  expect(mocks.write).toHaveBeenCalledTimes(1);expect(mocks.fromResearch).toHaveBeenCalledTimes(1);
  expect(writeStep.maxRetries).toBe(0);
});
it('fails infrastructure errors consistently without writing',async()=>{
  mocks.getDraft.mockResolvedValue({instructions:'Test',generationResearchId:'research'});
  mocks.prepareResearch.mockRejectedValue(new Error('infrastructure'));
  await expect(articleWorkflow({id:'id'})).rejects.toThrow('research_failed');
  expect(mocks.markFailed).toHaveBeenCalledWith('id','research_failed');expect(mocks.write).not.toHaveBeenCalled();
});

describe('writing costs', () => {
  it('records the writing call once per draft before saving', async () => {
    await articleWorkflow({ id: 'id' });
    expect(costs.trackCost).toHaveBeenCalledTimes(1);
    expect(costs.trackCost).toHaveBeenCalledWith({key:'writing:id',stage:'writing',draftId:'id',researchResultId:null,evaluationAttemptId:null,errorCode:null,call:costs.call});
    expect(costs.trackCost.mock.invocationCallOrder[0]).toBeLessThan(mocks.completeDraft.mock.invocationCallOrder[0]);
  });
  it('records failed writing calls with their provider code', async () => {
    mocks.generate.mockRejectedValue(new GenerationError('incomplete'));
    await expect(articleWorkflow({ id: 'id' })).rejects.toThrow('incomplete');
    expect(costs.trackCost).toHaveBeenCalledWith(expect.objectContaining({key:'writing:id',errorCode:'incomplete'}));
  });
  it('records a failed regional writer and keeps the generic draft failure', async () => {
    mocks.getDraft.mockResolvedValue({instructions:'Test',generationResearchId:'research'});
    mocks.prepareResearch.mockResolvedValue({status:'completed',results:[{status:'completed'}]});
    mocks.fromResearch.mockResolvedValue({regionId:'catalonia',events:[]});
    mocks.write.mockRejectedValue(new GenerationError('invalid_content'));
    await expect(articleWorkflow({id:'id'})).rejects.toThrow('writing_failed');
    expect(costs.trackCost).toHaveBeenCalledWith(expect.objectContaining({stage:'writing',errorCode:'invalid_content'}));
    expect(mocks.markFailed).toHaveBeenCalledWith('id','writing_failed');
  });
});
