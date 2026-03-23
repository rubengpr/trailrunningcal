import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import { RaceForm } from '@/components/race/race-form';
import { raceRowToTrailRace } from '@/lib/db/races';
import { isAdminEmail } from '@/lib/auth-admin';
import type { RaceRow } from '@/types/race.types';

async function getRaceById(raceId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('races')
        .select('*')
        .eq('id', raceId);

    if (error) {
        console.error('Failed to fetch race:', error);
        return null;
    }

    const row = data?.[0] as RaceRow | undefined;
    if (!row) return null;

    return raceRowToTrailRace(row);
}

async function getRacePrice(raceId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('race_tiers')
        .select('price_eur')
        .eq('race_id', raceId)
        .maybeSingle();

    if (error) {
        console.error('Failed to fetch race price:', error);
        return null;
    }

    return data?.price_eur;
}

export default async function AdminRaceEditPage({
    params,
}: {
    params: Promise<{ locale: string; raceId: string }>;
}) {
    const { locale, raceId } = await params;

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect(`/${locale}/admin/login`);
    }

    if (!isAdminEmail(user.email)) {
        redirect(`/${locale}/admin/login`);
    }

    const isEditMode = raceId !== 'new';
    const race = isEditMode ? await getRaceById(raceId) : null;
    const priceEur = isEditMode ? await getRacePrice(raceId) : null;

    const initialRaceData = race != null ? { ...race, priceEur } : null;

    return (
        <AdminLayout>
            <RaceForm
                raceId={raceId}
                initialData={initialRaceData}
                isEditMode={isEditMode}
                redirectBasePath="admin/carreras"
            />
        </AdminLayout>
    );
}
