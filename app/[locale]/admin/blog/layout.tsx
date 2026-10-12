import type { ReactNode } from 'react';
import { AdminLayout } from '@/components/admin/admin-layout';
import { BlogProvider } from '@/components/admin/blog-provider';
import { requireBlogAdmin } from '@/lib/auth/blog-admin';

export default async function BlogLayout({ children, params }: {
  children: ReactNode; params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireBlogAdmin(locale);
  return (
    <AdminLayout>
      <BlogProvider>
        <div className="mx-auto w-full max-w-6xl space-y-6">
          {children}
        </div>
      </BlogProvider>
    </AdminLayout>
  );
}
