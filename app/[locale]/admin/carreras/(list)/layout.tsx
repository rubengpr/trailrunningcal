import { AdminLayout } from '@/components/admin/admin-layout';
import { AdminCarrerasTabs } from '@/components/admin/admin-carreras-tabs';

export default function CarrerasListLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminLayout>
            <div className="flex flex-col gap-8">
                <AdminCarrerasTabs />
                {children}
            </div>
        </AdminLayout>
    );
}
