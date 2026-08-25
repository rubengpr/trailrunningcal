import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getDraftPublicationStatus: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-import-drafts', () => ({
  getDraftPublicationStatus: mocks.getDraftPublicationStatus,
}));

import { GET } from './route';

const DRAFT_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const JOB_ID = '5a0738cf-2c96-43d5-b0ed-20ff7510137f';
const context = { params: Promise.resolve({ draftId: DRAFT_ID }) };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue(undefined);
});

describe('GET /api/events/import/drafts/[draftId]/publication', () => {
  it('requires an administrator', async () => {
    mocks.requireAdmin.mockRejectedValue(new AuthError());

    const response = await GET(new Request(`http://localhost?jobId=${JOB_ID}`), context);

    expect(response.status).toBe(401);
  });

  it('returns the matching publication job', async () => {
    const data = { job: { id: JOB_ID, draftId: DRAFT_ID, status: 'running' }, items: [] };
    mocks.getDraftPublicationStatus.mockResolvedValue(data);

    const response = await GET(new Request(`http://localhost?jobId=${JOB_ID}`), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data });
  });

  it('does not expose a job belonging to another draft', async () => {
    mocks.getDraftPublicationStatus.mockResolvedValue({
      job: { id: JOB_ID, draftId: 'another-draft', status: 'running' }, items: [],
    });

    const response = await GET(new Request(`http://localhost?jobId=${JOB_ID}`), context);

    expect(response.status).toBe(404);
  });
});
