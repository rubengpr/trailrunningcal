import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ValidationError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  acceptDraft: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-import-drafts', () => ({
  acceptDraft: mocks.acceptDraft,
}));

import { POST } from './route';

const DRAFT_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';

function context(draftId = DRAFT_ID) {
  return { params: Promise.resolve({ draftId }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue(undefined);
});

describe('POST /api/events/import/drafts/[draftId]/accept', () => {
  it('requires authentication before accepting a draft', async () => {
    mocks.requireAdmin.mockRejectedValue(new AuthError());

    const response = await POST(new Request('http://localhost'), context());

    expect(response.status).toBe(401);
    expect(mocks.acceptDraft).not.toHaveBeenCalled();
  });

  it('starts asynchronous publication for a draft', async () => {
    const data = { status: 'pending', jobId: 'job-id' };
    mocks.acceptDraft.mockResolvedValue(data);

    const response = await POST(new Request('http://localhost'), context());

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, data });
  });

  it('keeps the accepted response idempotent', async () => {
    const data = { status: 'accepted', eventId: 'event-id', eventSlug: 'trail-montan' };
    mocks.acceptDraft.mockResolvedValue(data);

    const response = await POST(new Request('http://localhost'), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data });
  });

  it('returns the service error', async () => {
    mocks.acceptDraft.mockRejectedValue(new ValidationError('Draft not found', 404));

    const response = await POST(new Request('http://localhost'), context());

    expect(response.status).toBe(404);
  });
});
