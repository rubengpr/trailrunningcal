import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireRevalidationSecret: vi.fn(),
  revalidateEventPages: vi.fn(),
}));

vi.mock('@/lib/auth/revalidation', () => ({
  requireRevalidationSecret: mocks.requireRevalidationSecret,
}));
vi.mock('@/lib/cache/revalidation', () => ({
  revalidateEventPages: mocks.revalidateEventPages,
}));

import { POST } from '@/app/api/internal/revalidate-events/route';

function request(body: unknown): NextRequest {
  return {
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

beforeEach(() => vi.resetAllMocks());

describe('POST /api/internal/revalidate-events', () => {
  it('authenticates before parsing input', async () => {
    mocks.requireRevalidationSecret.mockImplementation(() => {
      throw new AuthError();
    });
    const input = request({ slugs: ['trail-event'] });

    const response = await POST(input);

    expect(response.status).toBe(401);
    expect(input.json).not.toHaveBeenCalled();
  });

  it('revalidates every valid event slug', async () => {
    const response = await POST(request({ slugs: ['trail-event', 'another-event'] }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { slugs: ['trail-event', 'another-event'] },
    });
    expect(mocks.revalidateEventPages).toHaveBeenCalledWith('trail-event');
    expect(mocks.revalidateEventPages).toHaveBeenCalledWith('another-event');
  });
});
