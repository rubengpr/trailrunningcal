import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import { AdminRacesContent } from '@/components/admin/admin-races-content';
import { getRaces } from '@/lib/db/races';

export default async function AdminRacesPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect(`/${locale}/login`);
    }

    const races = await getRaces();

    return (
        <AdminLayout>
            <AdminRacesContent races={races} />
        </AdminLayout>
    );
}
