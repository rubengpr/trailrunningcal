import { redirect } from 'next/navigation';
import { OrganizerEventsContent } from '@/components/organizer/organizer-events-content';
import { OrganizerLayout } from '@/components/organizer/organizer-layout';
import { getEventsForOrganizer } from '@/lib/db/events';
import { getOrganizerByOwnerId } from '@/lib/db/organizers';
import { createClient } from '@/lib/supabase/server';

export default async function OrganizerEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactElement> {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/${locale}/login`);
  }

  const organizer = await getOrganizerByOwnerId(user.id);
  const events = organizer ? await getEventsForOrganizer(organizer.id) : [];

  return (
    <OrganizerLayout>
      <OrganizerEventsContent events={events} />
    </OrganizerLayout>
  );
}
