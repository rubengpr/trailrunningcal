import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  generateEventDraft: vi.fn(),
  proposeEventDraft: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-drafts', () => ({
  generateEventDraft: mocks.generateEventDraft,
  proposeEventDraft: mocks.proposeEventDraft,
}));

import { POST } from './route';

const EVENT_ID = '7a0a4eb8-e4a4-4e8d-8d0c-1d0ed0e2cf11';
const DRAFT_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const context = { params: Promise.resolve({ eventId: EVENT_ID }) };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('AGENT_API_TOKEN', 'test-agent-token');
  vi.stubEnv('AGENT_API_PERMISSIONS', 'read,propose');
  mocks.requireAdmin.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

const proposalData = {
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
      tiers: [],
    },
  ],
};

const agentRequest = (body: unknown, permissions = 'read,propose') => {
  vi.stubEnv('AGENT_API_PERMISSIONS', permissions);
  return new Request('http://localhost', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-agent-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
};

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

  it('creates a proposal from agent-supplied data', async () => {
    mocks.proposeEventDraft.mockResolvedValue({ id: DRAFT_ID });

    const response = await POST(agentRequest({ data: proposalData }), context);

    expect(response.status).toBe(201);
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.proposeEventDraft).toHaveBeenCalledWith(EVENT_ID, proposalData);
    expect(mocks.generateEventDraft).not.toHaveBeenCalled();
  });

  it('forbids agent proposals without the propose permission', async () => {
    const response = await POST(agentRequest({ data: proposalData }, 'read,update'), context);

    expect(response.status).toBe(403);
    expect(mocks.proposeEventDraft).not.toHaveBeenCalled();
  });

  it('rejects malformed proposal data', async () => {
    const response = await POST(agentRequest({ data: { event: {} } }), context);

    expect(response.status).toBe(400);
    expect(mocks.proposeEventDraft).not.toHaveBeenCalled();
  });
});
