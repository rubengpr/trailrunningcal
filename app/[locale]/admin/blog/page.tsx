import { BlogDraftList } from '@/components/admin/blog-draft-list';
import { requireBlogAdmin } from '@/lib/auth/blog-admin';
import { listDrafts } from '@/lib/db/blog-drafts';
import { parsePage } from '@/app/api/blog-drafts/validation';

export default async function BlogPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  await requireBlogAdmin(locale);
  const query = await searchParams;
  let page = 1;
  try { page = parsePage(query.page ?? null); } catch { page = 1; }
  return <BlogDraftList initial={await listDrafts(page)} />;
}
