import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isAdminEmail } from '@/lib/auth';
import { getEventImportDraftsPage } from '@/lib/db/event-import-drafts';
import {
  buildEventImportDraftsHref,
  parseEventImportDraftPageRequest,
} from '@/lib/event-import/draft-pagination';
import { AdminEventImportDraftsContent } from '@/components/admin/admin-event-import-drafts-content';

export default async function AdminEventosBorradoresPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const input = parseEventImportDraftPageRequest(rawSearchParams);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !isAdminEmail(user.email)) redirect(`/${locale}/admin/login`);
  const page = await getEventImportDraftsPage(input);
  const lastPage = Math.max(page.totalPages, 1);
  if (input.page > lastPage) {
    redirect(buildEventImportDraftsHref(locale, { ...input, page: lastPage }));
  }

  return <AdminEventImportDraftsContent initialPage={page} query={input} />;
}
