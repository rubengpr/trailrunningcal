import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import WeatherForm from '@/components/admin/weather-form';
import { isAdminEmail } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function WeatherPage({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/login`);
  if (!isAdminEmail(user.email)) redirect(`/${locale}/admin/login`);
  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-2xl"><WeatherForm /></div>
    </AdminLayout>
  );
}
