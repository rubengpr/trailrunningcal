import { notFound } from 'next/navigation';
import { BlogDraftView } from '@/components/admin/blog-draft-view';
import { getDraft } from '@/lib/db/blog-drafts';
import { parseUuidParam } from '@/app/api/request-validation';
import { requireBlogAdmin } from '@/lib/auth/blog-admin';

export default async function BlogDraftPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  await requireBlogAdmin(locale);
  try { parseUuidParam(id, 'draft id'); } catch { notFound(); }
  const draft = await getDraft(id);
  if (!draft) notFound();
  return <BlogDraftView initial={draft} />;
}
