import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isAdminEmail } from '@/lib/auth';
import { getEventImportDrafts } from '@/lib/db/event-import-drafts';
import { parseAdminEventPageRequest } from '@/lib/events/admin-pagination';
import { AdminEventImportDraftsContent } from '@/components/admin/admin-event-import-drafts-content';

export default async function AdminEventosBorradoresPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const { search } = parseAdminEventPageRequest(rawSearchParams);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !isAdminEmail(user.email)) redirect(`/${locale}/admin/login`);
  const drafts = await getEventImportDrafts();
  const normalizedSearch = search.toLocaleLowerCase();
  const filteredDrafts = normalizedSearch
    ? drafts.filter((draft) => (
      draft.data.event.name.toLocaleLowerCase().includes(normalizedSearch) ||
      draft.sourceUrl?.toLocaleLowerCase().includes(normalizedSearch)
    ))
    : drafts;

  return <AdminEventImportDraftsContent initialDrafts={filteredDrafts} search={search} />;
}
