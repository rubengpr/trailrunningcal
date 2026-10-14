import { context } from '@/tests/fixtures/blog-selection';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(), select: vi.fn(), order: vi.fn(), range: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(),
  insert: vi.fn(), update: vi.fn(), single: vi.fn(), neq: vi.fn(), delete: vi.fn(), in: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: mocks.from }) }));
import { completeDraft, createDraft, deleteDraft, getDraft, listDrafts } from './blog-drafts';
import type { GeneratedArticle } from '@/types/blog-article.types';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue(mocks);
  mocks.select.mockReturnValue(mocks);
  mocks.order.mockReturnValue(mocks);
  mocks.eq.mockReturnValue(mocks);
  mocks.insert.mockReturnValue(mocks);
  mocks.update.mockReturnValue(mocks);
  mocks.neq.mockReturnValue(mocks);
  mocks.delete.mockReturnValue(mocks);
  mocks.in.mockReturnValue(mocks);
});

describe('draft queries', () => {
  it('deletes atomically only when both lifecycle states allow it', async () => {
    mocks.maybeSingle.mockResolvedValue({data:{id:'id'},error:null});
    expect(await deleteDraft('id')).toBe(true);
    expect(mocks.in.mock.calls).toEqual([['status',['completed','failed']],['evaluation_status',['not_evaluated','completed','failed']]]);
    expect(mocks.from).toHaveBeenCalledWith('blog_drafts');
  });
  it('reports a missing conditional deletion and propagates errors', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({data:null,error:null}).mockResolvedValueOnce({data:null,error:new Error('DB')});
    expect(await deleteDraft('id')).toBe(false);
    await expect(deleteDraft('id')).rejects.toThrow('DB');
  });
  it('lets Supabase generate the UUID and initial state', async () => {
    mocks.single.mockResolvedValue({ data: { id: 'id' }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'id', status: 'queued', evaluation: null }, error: null });
    expect((await createDraft('Instructions')).id).toBe('id');
    expect(mocks.insert).toHaveBeenCalledWith({ instructions: 'Instructions' });
  });
  it('saves article, metadata and completion in one update without evaluations', async () => {
    const result: GeneratedArticle = {
      article: { title: 'Title', contentMarkdown: 'Markdown', primaryKeyword: 'keyword', slug: 'slug', seoTitle: 'SEO', metaDescription: 'Description' },
      contentHtml: '<p>Text</p>', model: 'gpt-6.1-sol', responseId: 'response', durationMs: 1000, usage: null,
    };
    await completeDraft('id', result);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Title', content_html: '<p>Text</p>', status: 'completed', error_code: null, model: 'gpt-6.1-sol',
    }));
    expect(mocks.from).toHaveBeenCalledWith('blog_drafts');
    expect(mocks.from).not.toHaveBeenCalledWith('blog_draft_evaluations');
  });
  it('uses stable ordering, page ranges and a nullable score', async () => {
    mocks.range.mockResolvedValue({ data: [
      { id: '1', title: 'Title', instructions: 'Input', status: 'completed', created_at: 'date', evaluation_status: 'completed', evaluation: { score: 92, critical_errors: [] } },
      { id: '2', title: null, instructions: 'Input', status: 'queued', created_at: 'date', evaluation: null },
    ], count: 52, error: null });
    const result = await listDrafts(2);
    expect(mocks.order.mock.calls).toEqual([
      ['created_at', { ascending: false }], ['id', { ascending: false }],
    ]);
    expect(mocks.range).toHaveBeenCalledWith(50, 99);
    expect(result.pagination).toEqual({ page: 2, pageSize: 50, total: 52, totalPages: 2 });
    expect(result.drafts.map(d => d.score)).toEqual([92, null]);
    expect(mocks.select.mock.calls[0][0]).not.toContain('content_html');
  });
  it('returns empty pages', async () => {
    mocks.range.mockResolvedValue({ data: [], count: 0, error: null });
    expect(await listDrafts(1)).toEqual({
      drafts: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    });
  });
  it('maps detail and evaluation without exposing internal tracking fields', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: {
      id: 'id', title: 'Title', instructions: 'Input', status: 'completed', created_at: 'created',
      updated_at: 'updated', content_html: '<p>Article</p>', primary_keyword: 'trail', slug: 'slug',
      seo_title: 'SEO', meta_description: 'Description', error_code: null,
      evaluation_status: 'completed',evaluation_error_code: null, evaluation: { score: 76, criteria: [], critical_errors: [], recommendations: [], created_at: 'evaluated' },
    }, error: null });
    expect(await getDraft('id')).toEqual({
      id: 'id', title: 'Title', instructions: 'Input', status: 'completed', createdAt: 'created',
      updatedAt: 'updated', contentHtml: '<p>Article</p>', primaryKeyword: 'trail', slug: 'slug',
      seoTitle: 'SEO', metaDescription: 'Description', errorCode: null, generationContext: null,
      evaluationStatus: 'completed', evaluationErrorCode: null, editorialStatus: 'needs_improvement', criticalCount: 0,
      evaluation: { score: 76, criteria: [], criticalErrors: [], recommendations: [], createdAt: 'evaluated' },
    });
    expect(mocks.eq).toHaveBeenCalledWith('id', 'id');
    expect(mocks.select.mock.calls[0][0]).not.toMatch(/workflow_run_id|model/);
  });
  it('returns null for missing detail', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getDraft('missing')).toBeNull();
  });
  it('maps a pending draft without evaluation', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'id', status: 'queued', evaluation: null }, error: null });
    expect((await getDraft('id'))?.evaluation).toBeNull();
  });
  it('propagates database errors', async () => {
    const error = new Error('Query failed');
    mocks.range.mockResolvedValue({ data: null, count: null, error });
    mocks.maybeSingle.mockResolvedValue({ data: null, error });
    await expect(listDrafts(1)).rejects.toBe(error);
    await expect(getDraft('id')).rejects.toBe(error);
  });
});

it('inserts source context with instructions and returns the same stored snapshot', async () => {
  mocks.single.mockResolvedValue({data: {id: 'id'}, error: null});
  mocks.maybeSingle.mockResolvedValue({data: {id: 'id', status: 'queued', evaluation: null, generation_context: context}, error: null});
  expect((await createDraft('Encargo', context)).generationContext).toEqual(context);
  expect(mocks.insert).toHaveBeenCalledWith({instructions: 'Encargo', generation_context: context});
});
