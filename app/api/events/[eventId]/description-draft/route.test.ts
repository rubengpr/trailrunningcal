import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  generateEventDescriptionDraft: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-description', () => ({
  DEFAULT_EVENT_DESCRIPTION_MODEL: 'default-model',
  generateEventDescriptionDraft: mocks.generateEventDescriptionDraft,
}));

import { POST } from './route';

const EVENT_ID = '5cd34b8e-8803-4b2d-bbae-8c7ba2a0a9ba';
const context = { params: Promise.resolve({ eventId: EVENT_ID }) };

function requestWithBody(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.generateEventDescriptionDraft.mockResolvedValue({ eventId: EVENT_ID });
});

describe('POST /api/events/[eventId]/description-draft', () => {
  it('returns 400 for a null request body', async () => {
    const response = await POST(requestWithBody(null), context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid request body' });
    expect(mocks.generateEventDescriptionDraft).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
    } as unknown as NextRequest;

    const response = await POST(request, context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid request body' });
    expect(mocks.generateEventDescriptionDraft).not.toHaveBeenCalled();
  });

  it('uses the default model when the model is omitted', async () => {
    const response = await POST(requestWithBody({}), context);

    expect(response.status).toBe(200);
    expect(mocks.generateEventDescriptionDraft).toHaveBeenCalledWith(
      EVENT_ID,
      'default-model',
    );
  });
});
