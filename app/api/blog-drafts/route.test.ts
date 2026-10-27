import { context as selectionContext } from '@/tests/fixtures/blog-selection';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ForbiddenError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(), selectedEvents: vi.fn(), researchEvents:vi.fn(), createGeneration:vi.fn(), listDrafts: vi.fn(), getDraft: vi.fn(), createDraft: vi.fn(), markFailed: vi.fn(), setRunId: vi.fn(), start: vi.fn(), getCosts: vi.fn(),
}));
vi.mock('@/lib/db/blog-costs', () => ({ getCosts: mocks.getCosts }));
vi.mock('@/lib/db/blog-events', () => ({selectedEvents: mocks.selectedEvents, researchEvents:mocks.researchEvents}));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db/blog-drafts', () => ({
  listDrafts: mocks.listDrafts, getDraft: mocks.getDraft, createDraft: mocks.createDraft,createGeneration:mocks.createGeneration, markFailed: mocks.markFailed, setRunId: mocks.setRunId,
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
  mocks.createGeneration.mockResolvedValue({id,status:'queued'});
  mocks.createDraft.mockResolvedValue({ id, status: 'queued',stage:'queued',progress:null,takingLong:false });
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
  it.each(['queued','running','failed'])('blocks %s without revealing partial content',async status=>{
    mocks.getDraft.mockResolvedValue({id,status,title:'Hidden',contentHtml:'Private'});
    const response=await detailRequest();expect(response.status).toBe(409);
    expect(await response.json()).toEqual({error:'Article not completed'});
  });
  it('returns a detail with no evaluation', async () => {
    const data = { id, status:'completed', evaluation: null };
    const costs = {costUsd:null,partial:true,groups:[]};
    mocks.getDraft.mockResolvedValue(data);
    mocks.getCosts.mockResolvedValue(costs);
    const response = await detailRequest();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: {...data, costs} });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.getDraft).toHaveBeenCalledWith(id);
  });
  it('exposes only the typed cost summary', async () => {
    const line = {id:'line',stage:'writing',eventName:null,attempt:null,model:'gpt-6.1-sol',status:'succeeded',
      tokens:{input:1,cachedInput:0,cacheWrite30m:0,cacheWrite12h:0,output:1,reasoning:0},searches:0,costUsd:0.000012};
    mocks.getDraft.mockResolvedValue({ id, status:'completed', evaluation:null });
    mocks.getCosts.mockResolvedValue({costUsd:0.000012,partial:false,groups:[{stage:'writing',costUsd:0.000012,partial:false,lines:[line]}]});
    const body = await (await detailRequest()).json();
    expect(Object.keys(body.data.costs.groups[0].lines[0]).sort()).toEqual(Object.keys(line).sort());
    expect(JSON.stringify(body)).not.toMatch(/usage|response_id|rates/);
  });
  it('keeps the article readable when costs cannot be read', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mocks.getDraft.mockResolvedValue({ id, status:'completed', evaluation:null });
      mocks.getCosts.mockRejectedValue(new Error('private details'));
      const response = await detailRequest();
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(JSON.parse(text).data.costs).toBeNull();
      expect(text).not.toContain('private details');
    } finally { log.mockRestore(); }
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
      expect(await response.json()).toEqual({ success: true, data: { id, status: 'queued',stage:'queued',progress:null,takingLong:false } });
      expect(mocks.createDraft).toHaveBeenCalledWith(instructions.trim());
    } else expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.listDrafts).not.toHaveBeenCalled();
    expect(mocks.getDraft).not.toHaveBeenCalled();
  });
});


describe('regional POST generation', () => {
  const selection = {regionId: 'catalonia', eventIds: selectionContext.events.map(event => event.id)};
  it.each([null, [], {regionId: 1, eventIds: []}, {regionId: 'catalonia'}, {eventIds: []}, {...selection, instructions: 'mixed'}, {...selection, eventIds: ['bad-uuid']}])('rejects malformed selection %#', async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.researchEvents).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled();
  });
  it.each(['andorra','ceuta','melilla','invalid'])('rejects region %s without queries or workflows', async regionId => {
    expect((await POST(request({...selection, regionId}))).status).toBe(422);
    expect(mocks.researchEvents).not.toHaveBeenCalled(); expect(mocks.createDraft).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled();
  });
  it('rejects incomplete and duplicated selections before lookup', async () => {
    for (const eventIds of [selection.eventIds.slice(1), selection.eventIds.map(() => selection.eventIds[0])]) {
      expect((await POST(request({...selection, eventIds}))).status).toBe(422);
    }
    expect(mocks.researchEvents).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled();
  });
  it('rejects events removed or moved out of the region', async () => {
    mocks.researchEvents.mockResolvedValue(selectionContext.events.slice(1));
    expect((await POST(request(selection))).status).toBe(422);
    expect(mocks.createDraft).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled();
  });
  it('persists minimal identities atomically before starting one workflow', async () => {
    mocks.researchEvents.mockResolvedValue([...selectionContext.events].reverse());
    expect((await POST(request(selection))).status).toBe(202);
    expect(mocks.createGeneration).toHaveBeenCalledWith('catalonia',expect.any(Array),expect.any(String),expect.any(String));
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.start).toHaveBeenCalledTimes(1);
  });
});
