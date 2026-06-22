import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminRacesContent } from '@/components/admin/admin-races-content';
import { getRacesForAdmin } from '@/lib/db/races';
import { isAdminEmail } from '@/lib/auth';

export default async function AdminRacesActivasPage({
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

    const races = await getRacesForAdmin();

    return <AdminRacesContent races={races} />;
}
