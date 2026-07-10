import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrganizerLayout } from '@/components/organizer/organizer-layout';
import { RaceForm } from '@/components/race/race-form';
import { getOrganizerRaceContext } from '@/lib/auth/organizer';

async function getRacePrice(raceId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('race_tiers')
        .select('price_eur')
        .eq('race_id', raceId)
        .maybeSingle();

    if (error) {
        console.error('Failed to fetch race:', error);
        return null;
    }

    return data?.price_eur
}

export default async function RaceFormPage({
    params,
}: {
    params: Promise<{ locale: string; raceId: string }>;
}) {
    const { locale, raceId } = await params;

    // Server-side authentication check
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Redirect to login if not authenticated
    if (error || !user) {
        redirect(`/${locale}/login`);
    }

    const isEditMode = raceId !== 'new';

    const organizerContext = isEditMode
        ? await getOrganizerRaceContext(supabase, raceId)
        : null;

    if (isEditMode && !organizerContext) {
        redirect(`/${locale}/org/carreras`);
    }

    const race = organizerContext?.race ?? null;

    const priceEur = isEditMode ? await getRacePrice(raceId) : null;

    const initialRaceData =
        race != null ? { ...race, priceEur } : null;

    return (
        <OrganizerLayout>
            <RaceForm raceId={raceId} initialData={initialRaceData} isEditMode={isEditMode} />
        </OrganizerLayout>
    );
}
