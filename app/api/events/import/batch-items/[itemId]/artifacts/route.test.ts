import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ForbiddenError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), getItemArtifacts: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db/event-import-batches', () => ({ getItemArtifacts: mocks.getItemArtifacts }));

import { GET } from './route';

const itemId = '11111111-1111-4111-8111-111111111111';
const request = new Request('http://localhost/api/events/import/batch-items/artifacts');
const context = (id = itemId) => ({ params: Promise.resolve({ itemId: id }) });

beforeEach(() => { vi.resetAllMocks(); });

describe('GET import item artifacts', () => {
  it.each([[new AuthError(), 401], [new ForbiddenError(), 403]] as const)(
    'rejects unauthorized access before reading artifacts', async (error, status) => {
      mocks.requireAdmin.mockRejectedValue(error);

      const response = await GET(request, context());

      expect(response.status).toBe(status);
      expect(mocks.getItemArtifacts).not.toHaveBeenCalled();
    },
  );

  it('rejects malformed item ids', async () => {
    expect((await GET(request, context('invalid'))).status).toBe(400);
    expect(mocks.getItemArtifacts).not.toHaveBeenCalled();
  });

  it('returns 404 for missing items', async () => {
    mocks.getItemArtifacts.mockResolvedValue(null);
    expect((await GET(request, context())).status).toBe(404);
  });

  it('returns artifacts in the success envelope', async () => {
    const data = { markdown: '# Crawl', rawModelOutput: '{"raw":true}' };
    mocks.getItemArtifacts.mockResolvedValue(data);
    const response = await GET(request, context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data });
  });

  it('returns a safe 500 on database failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.getItemArtifacts.mockRejectedValue(new Error('internal database detail'));
    const response = await GET(request, context());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });
  });
});
