import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminPendingEventsContent } from '@/components/admin/admin-pending-events-content';
import { getPendingEvents } from '@/lib/db/pending-events';
import { isAdminEmail } from '@/lib/auth';

export default async function AdminEventosPendientesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    redirect(`/${locale}/admin/login`);
  }

  const allEntries = await getPendingEvents();
  const entries = allEntries.filter((e) => e.status === 'pending');

  return <AdminPendingEventsContent entries={entries} />;
}
