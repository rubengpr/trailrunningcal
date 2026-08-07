import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminEventsContent } from '@/components/admin/admin-events-content';
import { getAdminEventsPage } from '@/lib/db/events';
import { isAdminEmail } from '@/lib/auth';
import {
  buildAdminEventsHref,
  parseAdminEventPageRequest,
} from '@/lib/events/admin-pagination';

export default async function AdminEventosActivosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const input = parseAdminEventPageRequest(rawSearchParams);

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    redirect(`/${locale}/admin/login`);
  }

  const eventsPage = await getAdminEventsPage(input);
  const lastPage = Math.max(eventsPage.totalPages, 1);

  if (input.page > lastPage) {
    redirect(buildAdminEventsHref(locale, { ...input, page: lastPage }));
  }

  return <AdminEventsContent page={eventsPage} query={input} />;
}
