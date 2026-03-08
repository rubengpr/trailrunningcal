import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { OrganizerLayout } from '@/components/organizer/organizer-layout';
import { OpenAIPlayground } from '@/components/playground/openai-playground';

export default async function PlaygroundPage({
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

  const t = await getTranslations('playground');

  return (
    <OrganizerLayout>
      <div className='flex flex-row mb-6 md:mb-10'>
        <h1 className='text-xl font-bold'>{t('title')}</h1>
      </div>
      <OpenAIPlayground />
    </OrganizerLayout>
  );
}
