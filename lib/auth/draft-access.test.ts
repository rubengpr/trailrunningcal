import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ForbiddenError } from '@/lib/errors';
import { requireDraftAccess } from './draft-access';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));

const request = (authorization?: string) => new Request('http://localhost', {
  headers: authorization === undefined ? {} : { authorization },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('AGENT_API_TOKEN', 'test-agent-token');
  vi.stubEnv('AGENT_API_PERMISSIONS', 'read,update');
  vi.stubEnv('AGENT_API_TOKEN_EXPIRES_AT', '');
  mocks.requireAdmin.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe('draft access', () => {
  it('preserves administrator cookie authentication', async () => {
    await requireDraftAccess(request(), 'publish');
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    mocks.requireAdmin.mockRejectedValue(new AuthError());
    await expect(requireDraftAccess(request(), 'read')).rejects.toBeInstanceOf(AuthError);
  });

  it('accepts the configured token without requiring a user session', async () => {
    await requireDraftAccess(request('bearer test-agent-token'), 'update');
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  it.each(['Bearer wrong-token', 'Basic test-agent-token', 'Bearer', 'Bearer test-agent-token extra'])
    ('rejects invalid credentials without falling back to cookies: %s', async (header) => {
      await expect(requireDraftAccess(request(header), 'read')).rejects.toBeInstanceOf(AuthError);
      expect(mocks.requireAdmin).not.toHaveBeenCalled();
    });

  it('disables token access when the server secret is missing', async () => {
    vi.stubEnv('AGENT_API_TOKEN', '');
    await expect(requireDraftAccess(request('Bearer test-agent-token'), 'read')).rejects.toBeInstanceOf(AuthError);
  });

  it.each(['create', 'reject', 'publish'] as const)('denies the %s permission by default', async (permission) => {
    vi.stubEnv('AGENT_API_PERMISSIONS', undefined);
    await expect(requireDraftAccess(request('Bearer test-agent-token'), permission)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('allows only explicitly configured permissions', async () => {
    vi.stubEnv('AGENT_API_PERMISSIONS', 'read, publish');
    await requireDraftAccess(request('Bearer test-agent-token'), 'publish');
    await expect(requireDraftAccess(request('Bearer test-agent-token'), 'update')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it.each(['2000-01-01T00:00:00Z', 'invalid'])('rejects expired or invalid expiration: %s', async (expiresAt) => {
    vi.stubEnv('AGENT_API_TOKEN_EXPIRES_AT', expiresAt);
    await expect(requireDraftAccess(request('Bearer test-agent-token'), 'read')).rejects.toBeInstanceOf(AuthError);
  });

  it('accepts an unexpired token', async () => {
    vi.stubEnv('AGENT_API_TOKEN_EXPIRES_AT', '2099-01-01T00:00:00Z');
    await requireDraftAccess(request('Bearer test-agent-token'), 'read');
  });
});
