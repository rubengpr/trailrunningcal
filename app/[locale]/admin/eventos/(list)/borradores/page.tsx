import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isAdminEmail } from '@/lib/auth';
import { getEventImportDrafts } from '@/lib/db/event-import-drafts';
import { AdminEventImportDraftsContent } from '@/components/admin/admin-event-import-drafts-content';

export default async function AdminEventosBorradoresPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !isAdminEmail(user.email)) redirect(`/${locale}/admin/login`);
  return <AdminEventImportDraftsContent initialDrafts={await getEventImportDrafts()} />;
}
