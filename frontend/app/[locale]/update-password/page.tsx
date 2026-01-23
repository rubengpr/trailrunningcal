import { UpdatePasswordForm } from '@/components/update-password-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Server-side authentication check
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // Redirect to password recovery if not authenticated
  if (error || !user) {
    redirect(`/${locale}/password-recovery`);
  }
  
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
