import { AdminLayout } from '@/components/admin/admin-layout';
import { AdminRacesTabs } from '@/components/admin/admin-races-tabs';

export default function CarrerasListLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminLayout>
            <div className="flex flex-col gap-8">
                <AdminRacesTabs />
                {children}
            </div>
        </AdminLayout>
    );
}
