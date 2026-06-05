import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import { EventImporter } from '@/components/admin/event-importer';
import { getPendingEvents } from '@/lib/db/pending-events';
import { isAdminEmail } from '@/lib/auth';

export default async function AdminEventImportPage({
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

  const queueEntries = await getPendingEvents();
  const pendingEntries = queueEntries.filter((e) => e.status === 'pending');

  return (
    <AdminLayout>
      <EventImporter pendingEntries={pendingEntries} />
    </AdminLayout>
  );
}
