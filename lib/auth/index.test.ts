import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
  });
});

describe('authorization guards', () => {
  it('rejects a missing identity as unauthorized', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Missing session'),
    });
    const [{ requireAuth }, { AuthError }] = await Promise.all([
      import('@/lib/auth'),
      import('@/lib/errors'),
    ]);

    await expect(requireAuth()).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects an authenticated non-admin as forbidden', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@example.com');
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'runner@example.com' } },
      error: null,
    });
    const [{ requireAdmin }, { ForbiddenError }] = await Promise.all([
      import('@/lib/auth'),
      import('@/lib/errors'),
    ]);

    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('allows an authenticated admin', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@example.com');
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@example.com' } },
      error: null,
    });
    const { requireAdmin } = await import('@/lib/auth');

    await expect(requireAdmin()).resolves.toBeUndefined();
  });
});
