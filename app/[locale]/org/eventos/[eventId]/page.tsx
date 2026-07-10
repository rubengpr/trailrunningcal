import { redirect } from 'next/navigation';
import { getOrganizerEventContext } from '@/lib/auth/organizer';
import { createClient } from '@/lib/supabase/server';
import { EventForm } from '@/components/event/event-form';
import { OrganizerLayout } from '@/components/organizer/organizer-layout';

export default async function OrganizerEventEditPage({
  params,
}: {
  params: Promise<{ locale: string; eventId: string }>;
}): Promise<React.ReactElement> {
  const { locale, eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/${locale}/login`);
  }

  const organizerContext = await getOrganizerEventContext(supabase, eventId);

  if (!organizerContext) {
    redirect(`/${locale}/org/eventos`);
  }

  return (
    <OrganizerLayout>
      <EventForm
        eventId={eventId}
        initialData={organizerContext.event}
        isEditMode
        apiMode="organizer"
      />
    </OrganizerLayout>
  );
}
