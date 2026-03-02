'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { InfoBanner } from './info-banner';
import { SectionHeader } from './section-header';
import TrailRaceCard from './trail-race-card';
import type { TrailRace } from '@/types/race.types';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';
import { generateRaceSlug } from '@/lib/race-utils';

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

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/D';
        return locale === 'ca'
            ? formatDateToCatalan(dateString)
            : formatDateToSpanish(dateString);
    };

    const formatPrice = (price: TrailRace['priceEur']): string => {
        if (price === null) return '-';
        if (typeof price === 'number') return `${price}€`;
        if (Array.isArray(price) && price.length > 0) {
            const priceValue = price[0].price_eur;
            if (priceValue === null || priceValue === undefined) return '-';
            return `${priceValue}€`;
        }
        return '-';
    };

    return (
        <>
            <div className='flex flex-col gap-8'>
                <SectionHeader
                    title={tTable('title')}
                    subtitle={
                        hasRealRaces
                            ? displayRaces.length === 1
                                ? tTable('raceCountOne')
                                : tTable('raceCount', { count: displayRaces.length })
                            : tTable('raceCount', { count: displayRaces.length })
                    }
                    action={
                        <span title={isAtLimit ? tTable('raceLimitReached') : undefined}>
                            <button
                                onClick={() => router.push(`/${locale}/org/carreras/new`)}
                                disabled={isAtLimit}
                                className='px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 w-fit shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                {t('newRaceButton')}
                            </button>
                        </span>
                    }
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

                {/* Cards - Mobile only */}
                <div className='w-full sm:hidden space-y-4'>
                    {displayRaces.map((race, index) => (
                        <div
                            key={index}
                            onClick={hasRealRaces && race.id ? () => handleRaceClick(race.id) : undefined}
                            className={hasRealRaces ? 'cursor-pointer' : ''}
                        >
                            <TrailRaceCard
                                date={race.date}
                                name={race.name}
                                distanceKm={race.distanceKm}
                                elevationGainM={race.elevationGainM}
                                priceEur={race.priceEur ?? null}
                                city={race.city}
                                province={race.province}
                                raceSlug={generateRaceSlug(race.name)}
                                organizerId={race.organizerId}
                                displayOnly={true}
                            />
                        </div>
                    ))}
                </div>

                {/* Table - Desktop only */}
                <div className='hidden sm:block w-full bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden'>
                    <div className='overflow-x-auto'>
                        <table className='w-full'>
                            <thead>
                                <tr className='border-b border-gray-100'>
                                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider sticky left-0 bg-white z-10 ${!hasRealRaces ? 'text-gray-300' : 'text-gray-500'
                                        }`}>
                                        {tTable('name')}
                                    </th>
                                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${!hasRealRaces ? 'text-gray-300' : 'text-gray-500'
                                        }`}>
                                        {tTable('date')}
                                    </th>
                                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${!hasRealRaces ? 'text-gray-300' : 'text-gray-500'
                                        }`}>
                                        {tTable('distance')}
                                    </th>
                                    <th className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${!hasRealRaces ? 'text-gray-300' : 'text-gray-500'
                                        }`}>
                                        {tTable('price')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='bg-white divide-y divide-gray-50'>
                                {displayRaces.map((race, index) => (
                                    <tr
                                        key={index}
                                        onClick={hasRealRaces && race.id ? () => handleRaceClick(race.id) : undefined}
                                        className={hasRealRaces ? 'hover:bg-gray-50/50 transition-colors duration-150 group cursor-pointer' : ''}
                                    >
                                        <td className={`px-6 py-5 whitespace-nowrap sticky left-0 bg-white z-10 ${hasRealRaces ? 'group-hover:bg-gray-50/50' : ''
                                            }`}>
                                            <div className={`text-sm font-medium ${!hasRealRaces ? 'text-gray-300' : 'text-gray-900'
                                                }`}>
                                                {race.name}
                                            </div>
                                        </td>
                                        <td className='px-6 py-5 whitespace-nowrap'>
                                            <div className={`text-sm ${!hasRealRaces ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                {formatDate(race.date)}
                                            </div>
                                        </td>
                                        <td className='px-6 py-5 whitespace-nowrap'>
                                            <div className={`text-sm ${!hasRealRaces ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                {race.distanceKm} km
                                            </div>
                                        </td>
                                        <td className='px-6 py-5 whitespace-nowrap text-right'>
                                            <div className={`text-sm font-medium ${!hasRealRaces ? 'text-gray-300' : 'text-gray-900'
                                                }`}>
                                                {formatPrice(race.priceEur)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
