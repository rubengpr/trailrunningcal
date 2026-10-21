import { notFound } from 'next/navigation';
import { requireBlogAdmin } from '@/lib/auth/blog-admin';
import { getRun } from '@/lib/db/blog-research';
import { parseUuidParam } from '@/app/api/request-validation';
import { ValidationError } from '@/lib/errors';
import { BlogResearchView } from '@/components/admin/blog-research-view';

export default async function ResearchPage({params}: {params:Promise<{locale:string;id:string}>}) {
  const {locale,id} = await params;
  await requireBlogAdmin(locale);
  try {parseUuidParam(id,'research id');} catch {notFound();}
  const run = await getRun(id).catch(error => {
    if (error instanceof ValidationError && error.status === 404) notFound();
    throw error;
  });
  return <BlogResearchView initial={run} />;
}
