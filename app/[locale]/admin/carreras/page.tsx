import { redirect } from 'next/navigation';

export default async function AdminRacesPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    redirect(`/${locale}/admin/carreras/activas`);
}
