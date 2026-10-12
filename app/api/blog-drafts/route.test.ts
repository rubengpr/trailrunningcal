import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ForbiddenError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(), listDrafts: vi.fn(), getDraft: vi.fn(), createDraft: vi.fn(), markFailed: vi.fn(), setRunId: vi.fn(), start: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db/blog-drafts', () => ({
  listDrafts: mocks.listDrafts, getDraft: mocks.getDraft, createDraft: mocks.createDraft, markFailed: mocks.markFailed, setRunId: mocks.setRunId,
}));

vi.mock('workflow/api', () => ({ start: mocks.start }));
vi.mock('@/lib/workflows/blog-article', () => ({ articleWorkflow: vi.fn() }));
import { GET, POST } from './route';
import { GET as detail } from './[id]/route';

const id = '88af92ed-7683-4b51-afb5-feb390ab72f6';
const request = (body: unknown) => new Request('http://localhost/api/blog-drafts', {
  method: 'POST', body: JSON.stringify(body),
});
const detailRequest = (draftId = id) => detail(
  new Request('http://localhost/api/blog-drafts/' + draftId),
  { params: Promise.resolve({ id: draftId }) },
);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue(undefined);
  mocks.createDraft.mockResolvedValue({ id, status: 'queued' });
  mocks.start.mockResolvedValue({ runId: 'run-id' });
});

describe('authorization', () => {
  it.each([
    ['list', () => GET(new Request('http://localhost/api/blog-drafts'))],
    ['detail', () => detailRequest()],
    ['generate', () => POST(request({ instructions: 'x'.repeat(10) }))],
  ])('%s rejects unauthenticated and non-admin users before database access', async (_name, call) => {
    for (const [error, status] of [[new AuthError(), 401], [new ForbiddenError(), 403]] as const) {
      mocks.requireAdmin.mockRejectedValue(error);
      expect((await call()).status).toBe(status);
      expect(mocks.listDrafts).not.toHaveBeenCalled();
      expect(mocks.getDraft).not.toHaveBeenCalled();
      expect(mocks.createDraft).not.toHaveBeenCalled();
      expect(mocks.start).not.toHaveBeenCalled();
    }
  });
});

describe('GET list', () => {
  it('returns the page and forbids caching', async () => {
    const data = { drafts: [], pagination: { page: 2, pageSize: 50, total: 2, totalPages: 1 } };
    mocks.listDrafts.mockResolvedValue(data);
    const response = await GET(new Request('http://localhost/api/blog-drafts?page=2'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.listDrafts).toHaveBeenCalledWith(2);
    expect(await response.json()).toEqual({ success: true, data });
  });
  it('defaults to page one', async () => {
    mocks.listDrafts.mockResolvedValue({ drafts: [] });
    await GET(new Request('http://localhost/api/blog-drafts'));
    expect(mocks.listDrafts).toHaveBeenCalledWith(1);
  });
  it.each(['', '0', '-1', '1.5', 'abc', 'Infinity', '9007199254740992'])('rejects page %s', async value => {
    expect((await GET(new Request('http://localhost/api/blog-drafts?page=' + value))).status).toBe(400);
    expect(mocks.listDrafts).not.toHaveBeenCalled();
  });
  it('hides internal errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mocks.listDrafts.mockRejectedValue(new Error('private database details'));
      const response = await GET(new Request('http://localhost/api/blog-drafts'));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal server error' });
    } finally { log.mockRestore(); }
  });
});

describe('GET detail', () => {
  it('returns a detail with no evaluation', async () => {
    const data = { id, evaluation: null };
    mocks.getDraft.mockResolvedValue(data);
    const response = await detailRequest();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.getDraft).toHaveBeenCalledWith(id);
  });
  it('returns 404 for a missing record', async () => {
    mocks.getDraft.mockResolvedValue(null);
    const response = await detailRequest();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Blog draft not found' });
  });
  it('rejects invalid UUIDs before querying', async () => {
    expect((await detailRequest('primer-trail')).status).toBe(400);
    expect(mocks.getDraft).not.toHaveBeenCalled();
  });
  it('hides internal detail errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mocks.getDraft.mockRejectedValue(new Error('private details'));
      const response = await detailRequest();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal server error' });
    } finally { log.mockRestore(); }
  });
});

describe('POST generation', () => {
  it('marks failed starts and preserves the record', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mocks.start.mockRejectedValue(new Error('private details'));
      const response = await POST(request({ instructions: 'Test instructions' }));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal server error' });
      expect(mocks.markFailed).toHaveBeenCalledWith(id, 'start_failed');
      expect(mocks.setRunId).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
  it('still accepts a started workflow if tracking fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mocks.setRunId.mockRejectedValue(new Error('tracking failure'));
      expect((await POST(request({ instructions: 'Test instructions' }))).status).toBe(202);
      expect(mocks.markFailed).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
  it.each([null, [], 'text', {}, { instructions: 10 }])('rejects invalid body %j', async body => {
    expect((await POST(request(body))).status).toBe(400);
  });
  it('rejects malformed JSON', async () => {
    const response = await POST(new Request('http://localhost/api/blog-drafts', { method: 'POST', body: '{' }));
    expect(response.status).toBe(400);
  });
  it.each([
    ['', 422], ['   ', 422], ['x'.repeat(9), 422],
    ['x'.repeat(10), 202], ['  ' + 'x'.repeat(10) + '  ', 202],
    ['x'.repeat(5000), 202], ['x'.repeat(5001), 422],
  ])('validates trimmed input case %#', async (instructions, status) => {
    const response = await POST(request({ instructions }));
    expect(response.status).toBe(status);
    if (status === 202) {
      expect(await response.json()).toEqual({ success: true, data: { id, status: 'queued' } });
      expect(mocks.createDraft).toHaveBeenCalledWith(instructions.trim());
    } else expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.listDrafts).not.toHaveBeenCalled();
    expect(mocks.getDraft).not.toHaveBeenCalled();
  });
});
