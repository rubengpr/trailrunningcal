import { requireBlogAdmin } from '@/lib/auth/blog-admin';
import { listRuns } from '@/lib/db/blog-research';
import { parsePage } from '@/app/api/blog-drafts/validation';
import { BlogResearchWorkspace } from '@/components/admin/blog-research-workspace';

export default async function ResearchPage({params,searchParams}: {params:Promise<{locale:string}>;searchParams:Promise<{page?:string}>}) {
  const {locale} = await params;
  await requireBlogAdmin(locale);
  let page = 1;
  try {page = parsePage((await searchParams).page ?? null);} catch {page = 1;}
  return <BlogResearchWorkspace initial={await listRuns(null,page)} />;
}
