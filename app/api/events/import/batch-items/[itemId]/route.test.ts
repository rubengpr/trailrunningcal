import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ForbiddenError, ValidationError } from '@/lib/errors';
import type { EventImportResult } from '@/types/events-import-api.types';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getItemResult: vi.fn(),
  acceptItem: vi.fn(),
  updateItemResult: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db/event-import-batches', () => ({
  getItemResult: mocks.getItemResult,
}));
vi.mock('@/lib/services/event-import-batch', () => ({
  acceptItem: mocks.acceptItem,
  updateItemResult: mocks.updateItemResult,
}));

import { PATCH, POST } from './route';

const ITEM_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const input = {
  event: {
    name: 'Edited Trail Event',
    description: 'Edited description',
    websiteUrl: 'https://example.com/event',
  },
  races: [
    {
      name: 'Edited 21K',
      date: '2027-05-01',
      city: 'Barcelona',
      province: 'Barcelona',
      distanceKm: 21,
      elevationGainM: 900,
      tiers: [{ priceEur: 25, endsAt: null }],
    },
  ],
};

const result: EventImportResult = {
  workflow: 'crawlSiteExtract',
  url: 'https://example.com/event',
  event: input.event,
  races: input.races,
  errorMessage: null,
  markdown: '# Event',
  rawModelOutput: '{}',
  usage: null,
  pageStats: null,
  scrapeUsage: null,
  fallbackUsed: false,
  steps: [],
};

function request(body: unknown): Request {
  return new Request(
    `http://localhost/api/events/import/batch-items/${ITEM_ID}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

function context(itemId = ITEM_ID) {
  return { params: Promise.resolve({ itemId }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue(undefined);
});

describe('PATCH /api/events/import/batch-items/[itemId]', () => {
  it('requires authentication before validating or updating the item', async () => {
    mocks.requireAdmin.mockRejectedValue(new AuthError());

    const response = await PATCH(request(input), context());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(mocks.updateItemResult).not.toHaveBeenCalled();
  });

  it('rejects non-admin users', async () => {
    mocks.requireAdmin.mockRejectedValue(new ForbiddenError());

    const response = await PATCH(request(input), context());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(mocks.updateItemResult).not.toHaveBeenCalled();
  });

  it('rejects malformed item ids', async () => {
    const response = await PATCH(request(input), context('not-a-uuid'));

    expect(response.status).toBe(400);
    expect(mocks.updateItemResult).not.toHaveBeenCalled();
  });

  it('rejects invalid event and race data', async () => {
    const response = await PATCH(
      request({ ...input, races: [] }),
      context(),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateItemResult).not.toHaveBeenCalled();
  });

  it('updates a completed item with validated review data', async () => {
    mocks.updateItemResult.mockResolvedValue(result);

    const response = await PATCH(request(input), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: result,
    });
    expect(mocks.updateItemResult).toHaveBeenCalledWith(ITEM_ID, input);
  });

  it('returns 404 when the item is missing or has no completed result', async () => {
    mocks.updateItemResult.mockRejectedValue(
      new ValidationError('Item not found', 404),
    );

    const response = await PATCH(request(input), context());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Item not found' });
  });

  it('returns 409 when the item was already accepted', async () => {
    mocks.updateItemResult.mockRejectedValue(
      new ValidationError('Accepted items cannot be edited', 409),
    );

    const response = await PATCH(request(input), context());

    expect(response.status).toBe(409);
  });
});

describe('POST /api/events/import/batch-items/[itemId]', () => {
  const postRequest = new Request(
    `http://localhost/api/events/import/batch-items/${ITEM_ID}`,
    { method: 'POST' },
  );

  it('requires an admin', async () => {
    mocks.requireAdmin.mockRejectedValue(new AuthError());

    const response = await POST(postRequest, context());

    expect(response.status).toBe(401);
    expect(mocks.acceptItem).not.toHaveBeenCalled();
  });

  it('rejects non-admin users', async () => {
    mocks.requireAdmin.mockRejectedValue(new ForbiddenError());

    const response = await POST(postRequest, context());

    expect(response.status).toBe(403);
    expect(mocks.acceptItem).not.toHaveBeenCalled();
  });

  it('rejects malformed item ids', async () => {
    const response = await POST(postRequest, context('not-a-uuid'));

    expect(response.status).toBe(400);
    expect(mocks.acceptItem).not.toHaveBeenCalled();
  });

  it('accepts a completed item and returns its event id', async () => {
    mocks.acceptItem.mockResolvedValue({
      eventId: 'event-1',
      eventSlug: 'accepted-event',
    });

    const response = await POST(postRequest, context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        eventId: 'event-1',
        eventSlug: 'accepted-event',
      },
    });
  });

  it.each([
    [404, 'Item not found'],
    [409, 'Accepted event not found'],
  ])('returns %s for an unavailable item', async (status, message) => {
    mocks.acceptItem.mockRejectedValue(new ValidationError(message, status));

    const response = await POST(postRequest, context());

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: message });
  });
});
