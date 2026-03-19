import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLoginForm } from '@/components/admin/admin-login-form';
import { isAdminEmail } from '@/lib/auth-admin';

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!error && user && isAdminEmail(user.email)) {
    redirect(`/${locale}/admin/carreras`);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <AdminLoginForm />
      </div>
    </div>
  );
}
