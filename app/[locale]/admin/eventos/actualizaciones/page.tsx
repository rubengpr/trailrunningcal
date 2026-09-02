import { redirect } from 'next/navigation';

import { AdminLayout } from '@/components/admin/admin-layout';
import { AdminEventUpdatesContent } from '@/components/admin/admin-event-updates-content';
import { isAdminEmail } from '@/lib/auth';
import {
  getEventUpdateBatchStatus,
  listEventUpdateBatchHistory,
} from '@/lib/services/event-update-batch';
import { createClient } from '@/lib/supabase/server';

export default async function AdminEventUpdatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ batchId?: string }>;
}) {
  const [{ locale }, { batchId }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !isAdminEmail(user.email)) redirect(`/${locale}/admin/login`);

  const history = await listEventUpdateBatchHistory();
  const selectedId = batchId && history.some((entry) => entry.batch.id === batchId)
    ? batchId
    : history[0]?.batch.id;
  const initialSnapshot = selectedId ? await getEventUpdateBatchStatus(selectedId) : null;

  return (
    <AdminLayout>
      <AdminEventUpdatesContent
        initialHistory={history}
        initialSnapshot={initialSnapshot}
      />
    </AdminLayout>
  );
}
