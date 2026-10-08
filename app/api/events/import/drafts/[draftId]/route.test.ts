import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PATCH, DELETE } from './route';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(), getDraft: vi.fn(), updateDraft: vi.fn(), rejectDraft: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-import-drafts', () => ({
  getDraft: mocks.getDraft, updateDraft: mocks.updateDraft, rejectDraft: mocks.rejectDraft,
}));

const id = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const context = () => ({ params: Promise.resolve({ draftId: id }) });
const request = (method: string, token = 'test-token', body?: string) => new Request('http://localhost', {
  method, headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('AGENT_API_TOKEN', 'test-token');
  vi.stubEnv('AGENT_API_PERMISSIONS', 'read,update');
  vi.stubEnv('AGENT_API_TOKEN_EXPIRES_AT', '');
});
afterEach(() => vi.unstubAllEnvs());

describe('draft endpoint Bearer authentication', () => {
  it('reads a draft without a browser session', async () => {
    mocks.getDraft.mockResolvedValue({ id });
    const response = await GET(request('GET'), context());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: { id } });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  it('rejects incorrect credentials before accessing data', async () => {
    const response = await GET(request('GET', 'wrong'), context());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(mocks.getDraft).not.toHaveBeenCalled();
  });

  it('retains input validation for authenticated updates', async () => {
    const response = await PATCH(request('PATCH', 'test-token', '{}'), context());
    expect(response.status).toBe(400);
    expect(mocks.updateDraft).not.toHaveBeenCalled();
  });

  it('requires the reject permission before deleting', async () => {
    const response = await DELETE(request('DELETE'), context());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(mocks.rejectDraft).not.toHaveBeenCalled();
  });
});
