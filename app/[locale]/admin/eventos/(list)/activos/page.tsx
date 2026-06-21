import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminEventsContent } from '@/components/admin/admin-events-content';
import { getEventsForAdmin } from '@/lib/db/events';
import { isAdminEmail } from '@/lib/auth';

export default async function AdminEventosActivosPage({
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

  const events = await getEventsForAdmin();

  return <AdminEventsContent events={events} />;
}
