'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { InfoBanner } from '@/components/ui/info-banner';
import { RaceManagementList } from '@/components/race/race-management-list';
import type { TrailRace } from '@/types/race.types';

const MAX_RACES = 5;

// Dummy data - will be replaced with real data from API
const dummyRaces: TrailRace[] = [
    {
        id: 'dummy-1',
        date: '2026-05-17',
        name: 'Zegama-Aizkorri',
        distanceKm: 42.195,
        elevationGainM: 2736,
        priceEur: [{ price_eur: 75 }],
        city: 'Zegama',
        province: 'Guipúzcoa',
        description: null,
        websiteUrl: 'https://www.zegama-aizkorri.com/',
        organizerId: null,
    },
    {
        id: 'dummy-2',
        date: '2026-10-02',
        name: 'Salomon Ultra Pirineu',
        distanceKm: 100,
        elevationGainM: 6600,
        priceEur: [{ price_eur: 198 }],
        city: 'Bagà',
        province: 'Barcelona',
        description: null,
        websiteUrl: 'https://ultrapirineu.com/es/',
        organizerId: null,
    },
];

interface OrganizerRacesContentProps {
    races: TrailRace[];
}

export function OrganizerRacesContent({ races }: OrganizerRacesContentProps) {
    const t = useTranslations('organizer.races');
    const tTable = useTranslations('organizer.races.table');
    const locale = useLocale();
    const router = useRouter();

    const hasRealRaces = races.length > 0;
    const isAtLimit = races.length >= MAX_RACES;
    const displayRaces = hasRealRaces ? races : dummyRaces;

    // Get the base URL for the link (works in both localhost and production)
    const baseUrl =
        typeof window !== 'undefined'
            ? window.location.origin
            : 'https://trailrunningcal.com';

    const handleRaceClick = (raceId: string) => {
        router.push(`/${locale}/org/carreras/${raceId}`);
    };

    return (
        <>
            <div className='flex flex-col gap-8'>
                <RaceManagementList
                    races={displayRaces}
                    onRaceClick={handleRaceClick}
                    labels={{
                        name: tTable('name'),
                        date: tTable('date'),
                        distance: tTable('distance'),
                        price: tTable('price'),
                    }}
                    headerTitle={tTable('title')}
                    headerSubtitle={
                        hasRealRaces
                            ? displayRaces.length === 1
                                ? tTable('raceCountOne')
                                : tTable('raceCount', { count: displayRaces.length })
                            : tTable('raceCount', { count: displayRaces.length })
                    }
                    headerAction={
                        <span title={isAtLimit ? tTable('raceLimitReached') : undefined}>
                            <Button
                                onClick={() => router.push(`/${locale}/org/carreras/new`)}
                                disabled={isAtLimit}
                            >
                                {t('newRaceButton')}
                            </Button>
                        </span>
                    }
                    placeholderMode={!hasRealRaces}
                />

                {/* Banner for placeholder data */}
                {!hasRealRaces && (
                    <InfoBanner>
                        {tTable('claimBannerBefore')}{' '}
                        <Link
                            href={`${baseUrl}/${locale}`}
                            className='text-gray-900 hover:text-gray-700 underline font-medium'
                        >
                            {tTable('claimBannerLink')}
                        </Link>
                    </InfoBanner>
                )}

            </div>
        </>
    );
}
