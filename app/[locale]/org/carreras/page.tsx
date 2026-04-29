import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrganizerLayout } from '@/components/organizer/organizer-layout';
import { OrganizerRacesContent } from '@/components/organizer/organizer-races-content';
import { toTrailRace } from '@/lib/db/races';
import type { TrailRace, RaceRow } from '@/types/race.types';

export default async function OrganizerRacesPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Server-side authentication check
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Redirect to login if not authenticated
    if (error || !user) {
        redirect(`/${locale}/login`);
    }

    // Fetch organizer for this user
    let organizerRaces: TrailRace[] = [];

    try {
        const { data: organizer, error: organizerError } = await supabase
            .from('organizers')
            .select('id')
            .eq('owner_id', user.id)
            .single();

        if (organizerError || !organizer) {
            // No organizer record found - treat as no races yet
        } else {
            // Fetch races for this organizer
            const { data: racesData, error: racesError } = await supabase
                .from('races')
                .select(`
                    id,
                    name,
                    date,
                    distance_km,
                    elevation_gain_m,
                    city,
                    province,
                    organizer_id,
                    description,
                    map_url,
                    website_url,
                    race_tiers ( price_eur )
                  `)
                .eq('organizer_id', organizer.id)
                .order('date', { ascending: true, nullsFirst: false })
                .order('name', { ascending: true });

            if (racesError) {
                console.error('Failed to fetch organizer races:', racesError);
            } else {
                const rows = (racesData ?? []) as RaceRow[];

                organizerRaces = rows.map(toTrailRace);
            }
        }
    } catch (error) {
        console.error('Error fetching organizer races:', error);
        // Continue with empty array
    }

    return (
        <OrganizerLayout>
            <OrganizerRacesContent races={organizerRaces} />
        </OrganizerLayout>
    );
}
