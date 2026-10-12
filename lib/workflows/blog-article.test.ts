vi.mock('workflow', () => ({ FatalError: class extends Error {}, getWorkflowMetadata: () => ({workflowRunId:'run'}) }));
vi.mock('@/lib/workflows/blog-evaluation', () => ({runEvaluation:vi.fn()}));
import { runEvaluation } from '@/lib/workflows/blog-evaluation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationError } from '@/lib/blog/content';

const mocks = vi.hoisted(() => ({ getDraft: vi.fn(), markRunning: vi.fn(), completeDraft: vi.fn(), markFailed: vi.fn(), generate: vi.fn() }));
vi.mock('@/lib/db/blog-drafts', () => mocks);
vi.mock('@/lib/services/blog-article', () => ({ generate: mocks.generate }));
import { articleWorkflow, generateStep, saveStep } from './blog-article';

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
    expect(mocks.generate).toHaveBeenCalledWith('Test instructions');
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
