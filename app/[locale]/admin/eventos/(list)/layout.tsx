import { AdminLayout } from '@/components/admin/admin-layout';
import { AdminEventsTabs } from '@/components/admin/admin-events-tabs';

export default function EventosListLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <AdminEventsTabs />
        {children}
      </div>
    </AdminLayout>
  );
}
