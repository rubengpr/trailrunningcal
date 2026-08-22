import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ValidationError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  acceptDraft: vi.fn(),
  revalidatePublicListingPages: vi.fn(),
  revalidateEventPages: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-import-drafts', () => ({
  acceptDraft: mocks.acceptDraft,
}));
vi.mock('@/lib/cache/revalidation', () => ({
  revalidatePublicListingPages: mocks.revalidatePublicListingPages,
  revalidateEventPages: mocks.revalidateEventPages,
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

  it('accepts a draft and invalidates public listings and its event page', async () => {
    const data = { eventId: 'event-id', eventSlug: 'trail-montan' };
    mocks.acceptDraft.mockResolvedValue(data);

    const response = await POST(new Request('http://localhost'), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data });
    expect(mocks.revalidatePublicListingPages).toHaveBeenCalledOnce();
    expect(mocks.revalidateEventPages).toHaveBeenCalledWith('trail-montan');
  });

  it('returns the service error without invalidating pages', async () => {
    mocks.acceptDraft.mockRejectedValue(new ValidationError('Draft not found', 404));

    const response = await POST(new Request('http://localhost'), context());

    expect(response.status).toBe(404);
    expect(mocks.revalidatePublicListingPages).not.toHaveBeenCalled();
  });
});
