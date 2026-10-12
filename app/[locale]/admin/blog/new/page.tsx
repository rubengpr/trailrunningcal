import { redirect } from 'next/navigation';
import { requireBlogAdmin } from '@/lib/auth/blog-admin';

export default async function NewBlogDraftPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireBlogAdmin(locale);
  redirect(`/${locale}/admin/blog`);
}
