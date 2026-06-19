import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  generateEventDraft: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-drafts', () => ({
  generateEventDraft: mocks.generateEventDraft,
}));

import { POST } from './route';

const EVENT_ID = '7a0a4eb8-e4a4-4e8d-8d0c-1d0ed0e2cf11';
const DRAFT_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const context = { params: Promise.resolve({ eventId: EVENT_ID }) };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue(undefined);
});

describe('POST /api/events/[eventId]/drafts', () => {
  it('requires an admin before generation', async () => {
    mocks.requireAdmin.mockRejectedValue(new AuthError());

    const response = await POST(new Request('http://localhost'), context);

    expect(response.status).toBe(401);
    expect(mocks.generateEventDraft).not.toHaveBeenCalled();
  });

  it('generates and returns a pending draft', async () => {
    const draft = {
      id: DRAFT_ID,
      eventId: EVENT_ID,
      status: 'pending' as const,
      data: {
        event: {
          name: 'Trail Event',
          description: null,
          websiteUrl: 'https://example.com/event',
        },
        races: [
          {
            name: 'Trail Event - 21K',
            date: '2027-05-01',
            city: 'Barcelona',
            province: 'Barcelona',
            distanceKm: 21,
            elevationGainM: 900,
          },
        ],
      },
      createdAt: '2026-06-19T00:00:00.000Z',
      updatedAt: '2026-06-19T00:00:00.000Z',
    };
    mocks.generateEventDraft.mockResolvedValue(draft);

    const response = await POST(new Request('http://localhost'), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: draft,
    });
    expect(mocks.generateEventDraft).toHaveBeenCalledWith(EVENT_ID);
  });
});
