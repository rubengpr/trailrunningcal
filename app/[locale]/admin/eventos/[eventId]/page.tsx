import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import { EventForm } from '@/components/event/event-form';
import { isAdminEmail } from '@/lib/auth';
import { getEventByIdForAdmin } from '@/lib/db/events';
import { createClient } from '@/lib/supabase/server';

export default async function AdminEventEditPage({
  params,
}: {
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = await params;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    redirect(`/${locale}/admin/login`);
  }

  const eventDetail = await getEventByIdForAdmin(eventId);

  if (!eventDetail) {
    redirect(`/${locale}/admin/eventos/activos`);
  }

  return (
    <AdminLayout>
      <EventForm
        eventId={eventId}
        initialData={eventDetail}
        isEditMode
      />
    </AdminLayout>
  );
}
