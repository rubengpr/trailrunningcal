import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth';
import { AdminLayout } from '@/components/admin/admin-layout';
import { EventDescriptionGenerator } from '@/components/admin/event-description-generator';
import { getEventDescriptionCandidatesPage } from '@/lib/db/events';
import {
  buildEventDescriptionsHref,
  parseEventDescriptionPage,
} from '@/lib/event-description/pagination';

export default async function AdminEventDescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const page = parseEventDescriptionPage(rawSearchParams);
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    redirect(`/${locale}/admin/login`);
  }

  const candidatesPage = await getEventDescriptionCandidatesPage(page);
  const lastPage = Math.max(candidatesPage.totalPages, 1);
  if (page > lastPage) {
    redirect(buildEventDescriptionsHref(locale, lastPage));
  }

  return (
    <AdminLayout>
      <EventDescriptionGenerator page={candidatesPage} />
    </AdminLayout>
  );
}
