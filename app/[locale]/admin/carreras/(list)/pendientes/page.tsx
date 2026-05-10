import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminPendingRacesContent } from '@/components/admin/admin-pending-races-content';
import { getPendingRaces } from '@/lib/db/pending-races';
import { isAdminEmail } from '@/lib/auth';

export default async function AdminCarrerasPendientesPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect(`/${locale}/admin/login`);
    }

    if (!isAdminEmail(user.email)) {
        redirect(`/${locale}/admin/login`);
    }

    const allEntries = await getPendingRaces();
    const entries = allEntries.filter((e) => e.status === 'pending');

    return <AdminPendingRacesContent entries={entries} />;
}
