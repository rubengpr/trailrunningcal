import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import { RaceImporter } from '@/components/admin/race-importer';
import { getPendingRaces } from '@/lib/db/pending-races';
import { isAdminEmail } from '@/lib/auth-admin';

export default async function AdminImportPage({
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

    const queueEntries = await getPendingRaces();
    const pendingEntries = queueEntries.filter((e) => e.status === 'pending');

    return (
        <AdminLayout>
            <RaceImporter pendingEntries={pendingEntries} />
        </AdminLayout>
    );
}
