import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { OrganizerProfileForm } from '@/components/organizer-profile-form';
import { OrganizerSidebar } from '@/components/organizer-sidebar';

export default async function OrganizerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('organizer.profile');

  // Server-side authentication check
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (error || !user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, job_title')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Failed to fetch profile:', profileError)
  }

  return (
    <div className='flex flex-row'>
      <OrganizerSidebar />
      <div className='flex flex-col w-full p-6'>
        <div className='flex flex-row mb-10'>
          <h1 className='text-xl font-bold'>{t('title')}</h1>
        </div>
        <OrganizerProfileForm
          userEmail={user.email || ''}
          fullName={profile?.full_name}
          jobTitle={profile?.job_title} />
      </div>
    </div>
  );
}
