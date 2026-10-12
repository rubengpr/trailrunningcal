import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth';

export const requireBlogAdmin = cache(async (locale: string) => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/login`);
  if (!isAdminEmail(user.email)) redirect(`/${locale}/admin/login`);
});
