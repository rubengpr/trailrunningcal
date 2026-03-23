import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import { ScrapePageContent } from '@/components/admin/scrape-page-content';
import { isAdminEmail } from '@/lib/auth-admin';

export default async function AdminScrapePage({
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

    return (
        <AdminLayout>
            <ScrapePageContent />
        </AdminLayout>
    );
}
