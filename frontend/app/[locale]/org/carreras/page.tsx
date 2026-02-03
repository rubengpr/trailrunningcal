import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrganizerSidebar } from '@/components/organizer-sidebar';
import { OrganizerRacesContent } from '@/components/organizer-races-content';

export default async function OrganizerRacesPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Server-side authentication check
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Redirect to login if not authenticated
    if (error || !user) {
        redirect(`/${locale}/login`);
    }

    return (
        <div className='flex flex-row'>
            <OrganizerSidebar />
            <div className='flex flex-col w-full p-6'>
                <OrganizerRacesContent />
            </div>
        </div>
    );
}
