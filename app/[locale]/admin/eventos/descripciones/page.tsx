import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth';
import { AdminLayout } from '@/components/admin/admin-layout';
import { EventDescriptionGenerator } from '@/components/admin/event-description-generator';
import { getEvents } from '@/lib/db/events';

export default async function AdminEventDescriptionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    redirect(`/${locale}/admin/login`);
  }

  const events = await getEvents();

  return (
    <AdminLayout>
      <EventDescriptionGenerator events={events} />
    </AdminLayout>
  );
}
