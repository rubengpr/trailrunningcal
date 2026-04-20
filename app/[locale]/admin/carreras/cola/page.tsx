import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import { AdminRaceQueueContent } from '@/components/admin/admin-race-queue-content';
import { getRaceQueue } from '@/lib/db/race-queue';
import { isAdminEmail } from '@/lib/auth-admin';

export default async function AdminRaceQueuePage({
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

    const entries = await getRaceQueue();

    return (
        <AdminLayout>
            <AdminRaceQueueContent entries={entries} />
        </AdminLayout>
    );
}
