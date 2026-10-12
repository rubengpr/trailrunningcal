import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireBlogAdmin } from '@/lib/auth/blog-admin';

const { getUser, isAdminEmail } = vi.hoisted(() => ({ getUser: vi.fn(), isAdminEmail: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock('@/lib/auth', () => ({ isAdminEmail }));
vi.mock('next/navigation', () => ({ redirect: (href: string) => { throw new Error(href); } }));

beforeEach(() => vi.clearAllMocks());
describe('blog admin access', () => {
  it('redirects anonymous visitors to the locale login', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireBlogAdmin('es')).rejects.toThrow('/es/login');
    expect(isAdminEmail).not.toHaveBeenCalled();
  });
  it('rejects authenticated users who are not admins', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'member@example.com' } }, error: null });
    isAdminEmail.mockReturnValue(false);
    await expect(requireBlogAdmin('ca')).rejects.toThrow('/ca/admin/login');
  });
  it('allows a verified admin', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'admin@example.com' } }, error: null });
    isAdminEmail.mockReturnValue(true);
    await expect(requireBlogAdmin('en')).resolves.toBeUndefined();
    expect(isAdminEmail).toHaveBeenCalledWith('admin@example.com');
  });
  it('rejects a failed identity verification even when a user is returned', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'admin@example.com' } }, error: new Error('verification failed') });
    await expect(requireBlogAdmin('fr')).rejects.toThrow('/fr/login');
    expect(isAdminEmail).not.toHaveBeenCalled();
  });
});
