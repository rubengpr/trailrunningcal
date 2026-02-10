import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrganizerSidebar } from '@/components/organizer-sidebar';
import { OrganizerRacesContent } from '@/components/organizer-races-content';
import type { TrailRace, PriceValue } from '@/types/race.types';

// Shape of a row in the `races` table as returned by Supabase
type RaceRow = {
    id: string;
    name: string;
    date: string | null;
    distance_km: number;
    elevation_gain_m: number | null;
    price_eur?: PriceValue | null;
    city: string;
    province: string;
    description: string | null;
    map_url?: string | null;
    image_path?: string | null;
    services?: string[] | null;
    results_urls?: Array<{ year: number; url: string }> | null;
    sponsors?: string[] | null;
    organizer_id: string | null;
    website_url?: string | null;
};

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
            console.log('No organizer record found for user:', user.id);
        } else {
            // Fetch races for this organizer
            const { data: racesData, error: racesError } = await supabase
                .from('races')
                .select('*')
                .eq('organizer_id', organizer.id)
                .order('date', { ascending: true, nullsFirst: false });

            if (racesError) {
                console.error('Failed to fetch organizer races:', racesError);
            } else {
                const rows = (racesData ?? []) as RaceRow[];

                // Map database snake_case to TypeScript camelCase
                organizerRaces = rows.map(
                    (race): TrailRace => ({
                        id: race.id,
                        name: race.name,
                        date: race.date ?? null,
                        distanceKm: race.distance_km,
                        elevationGainM: race.elevation_gain_m ?? null,
                        priceEur: race.price_eur ?? null,
                        city: race.city,
                        province: race.province,
                        description: race.description ?? null,
                        mapUrl: race.map_url ?? null,
                        imagePath: race.image_path ?? null,
                        services: race.services ?? null,
                        resultsUrls: race.results_urls ?? null,
                        sponsors: race.sponsors ?? null,
                        organizerId: race.organizer_id ?? null,
                        websiteUrl: race.website_url ?? null,
                    }),
                );
            }
        }
    } catch (error) {
        console.error('Error fetching organizer races:', error);
        // Continue with empty array
    }

    return (
        <div className='flex flex-col md:flex-row'>
            <OrganizerSidebar />
            <div className='flex flex-col w-full p-6'>
                <OrganizerRacesContent races={organizerRaces} />
            </div>
        </div>
    );
}
