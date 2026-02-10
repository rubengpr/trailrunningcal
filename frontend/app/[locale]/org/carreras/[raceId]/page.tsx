import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrganizerSidebar } from '@/components/organizer-sidebar';
import { RaceForm } from '@/components/race-form';

export default async function RaceFormPage({
    params,
}: {
    params: Promise<{ locale: string; raceId: string }>;
}) {
    const { locale, raceId } = await params;

    // Server-side authentication check
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Redirect to login if not authenticated
    if (error || !user) {
        redirect(`/${locale}/login`);
    }

    const isEditMode = raceId !== 'new';

    return (
        <div className='flex flex-col md:flex-row'>
            <OrganizerSidebar />
            <div className='flex flex-col w-full p-6'>
                <RaceForm raceId={raceId} isEditMode={isEditMode} />
            </div>
        </div>
    );
}
