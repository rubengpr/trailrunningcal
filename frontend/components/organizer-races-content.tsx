'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { InfoModal } from './new-race-modal';
import TrailRaceCard from './trail-race-card';
import type { TrailRace } from '@/types/race.types';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';
import { generateRaceSlug } from '@/lib/race-utils';

// Dummy data - will be replaced with real data from API
const dummyRaces: TrailRace[] = [
    {
        date: '2026-02-08',
        name: 'Xtrail Series Run Mataró 21.5K',
        distanceKm: 21.5,
        elevationGainM: 870,
        priceEur: [
            { until: '2025-12-03', price: 28 },
            { until: '2026-01-25', price: 32 },
            { until: '2026-02-01', price: 36 },
        ],
        city: 'Mataró',
        province: 'Barcelona',
        websiteUrl: 'https://www.xtrailseriesrun.com/mataro',
    },
    {
        date: '2026-02-08',
        name: 'Xtrail Series Run Mataró 15.5K',
        distanceKm: 15.5,
        elevationGainM: 600,
        priceEur: [
            { until: '2025-12-03', price: 24 },
            { until: '2026-01-25', price: 28 },
            { until: '2026-02-01', price: 32 },
        ],
        city: 'Mataró',
        province: 'Barcelona',
        websiteUrl: 'https://www.xtrailseriesrun.com/mataro',
    },
    {
        date: '2026-01-18',
        name: 'Trail Cap de Creus 40K',
        distanceKm: 40,
        elevationGainM: 1800,
        priceEur: 70,
        city: 'Roses',
        province: 'Girona',
        websiteUrl: 'https://www.klassmark.com/trailcapdecreus/',
    },
    {
        date: '2026-01-18',
        name: 'Trail Cap de Creus 30K',
        distanceKm: 30,
        elevationGainM: 1300,
        priceEur: 60,
        city: 'Roses',
        province: 'Girona',
        websiteUrl: 'https://www.klassmark.com/trailcapdecreus/',
    },
    {
        date: '2026-03-08',
        name: 'Oli Trail 24K',
        distanceKm: 24,
        elevationGainM: 1200,
        priceEur: [
            { until: '2026-01-19', price: 25 },
            { until: '2026-03-06', price: 29 },
        ],
        city: 'Olesa de Montserrat',
        province: 'Barcelona',
        websiteUrl: 'https://www.olitrail.com/',
    },
    {
        date: '2026-03-08',
        name: 'Oli Trail 13K',
        distanceKm: 13,
        elevationGainM: 600,
        priceEur: [
            { until: '2026-01-19', price: 14 },
            { until: '2026-03-06', price: 17 },
        ],
        city: 'Olesa de Montserrat',
        province: 'Barcelona',
        websiteUrl: 'https://www.olitrail.com/',
    },
    {
        date: '2025-11-02',
        name: 'Vallalta Trail 15K',
        distanceKm: 23,
        elevationGainM: 1000,
        priceEur: 25,
        city: 'Sant Iscle de Vallalta',
        province: 'Barcelona',
        websiteUrl: 'https://vallaltatrail.com',
    },
    {
        date: '2025-10-12',
        name: 'Rural Trail 23.7K',
        distanceKm: 23.7,
        elevationGainM: 1000,
        priceEur: 23,
        city: 'Bigues i Riells del Fai',
        province: 'Barcelona',
        websiteUrl: 'https://ruraltrail.com',
    },
];

export function OrganizerRacesContent() {
    const t = useTranslations('organizer.races');
    const tTable = useTranslations('organizer.races.table');
    const tModal = useTranslations('organizer.races.infoModal');
    const locale = useLocale();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // For now, use dummy data. Later this will come from API
    const races = dummyRaces;
    const hasRaces = races.length > 0;

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/D';
        return locale === 'ca'
            ? formatDateToCatalan(dateString)
            : formatDateToSpanish(dateString);
    };

    const formatPrice = (price: TrailRace['priceEur']): string => {
        if (price === null) return 'N/D';
        if (typeof price === 'number') return `${price}€`;
        if (Array.isArray(price) && price.length > 0) {
            return `${price[0].price}€`;
        }
        return 'N/D';
    };

    const formatElevation = (elevation: number | null): string => {
        if (elevation === null) return 'N/D';
        return `${elevation} m`;
    };

    const formatCity = (city: string, province: string, isMobile: boolean): string => {
        if (isMobile) return city;
        return `${city} (${province})`;
    };

    if (!hasRaces) {
        return (
            <>
                <div className='flex flex-col items-center justify-center gap-6 min-h-[60vh]'>
                    <p className='text-base text-gray-700 text-center'>
                        {t('noRacesMessage')}{' '}
                        <Link
                            href={`/${locale}`}
                            className='text-indigo-600 hover:text-indigo-800 underline font-medium'
                        >
                            {t('noRacesMessageLink')}
                        </Link>
                    </p>
                    <button
                        onClick={handleOpenModal}
                        className='px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer w-fit'
                    >
                        {t('newRaceButton')}
                    </button>
                </div>
                <InfoModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    title={tModal('title')}
                    message={tModal('message')}
                    closeButtonLabel={tModal('close')}
                />
            </>
        );
    }

    return (
        <>
            <div className='flex flex-col gap-8'>
                {/* Header */}
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                    <div>
                        <h1 className='text-2xl font-semibold text-gray-900 tracking-tight'>
                            {tTable('title')}
                        </h1>
                        <p className='text-sm text-gray-500 mt-1'>
                            {races.length === 1
                                ? tTable('raceCountOne')
                                : tTable('raceCount', { count: races.length })}
                        </p>
                    </div>
                    <button
                        onClick={handleOpenModal}
                        className='px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 cursor-pointer w-fit shadow-sm hover:shadow'
                    >
                        {t('newRaceButton')}
                    </button>
                </div>

                {/* Cards - Mobile only */}
                <div className='w-full sm:hidden space-y-4'>
                    {races.map((race, index) => (
                        <TrailRaceCard
                            key={index}
                            date={race.date}
                            name={race.name}
                            distanceKm={race.distanceKm}
                            elevationGainM={race.elevationGainM}
                            priceEur={race.priceEur}
                            city={race.city}
                            province={race.province}
                            raceSlug={generateRaceSlug(race.name)}
                            isVerifiedOrganizer={race.isVerifiedOrganizer}
                            displayOnly={true}
                        />
                    ))}
                </div>

                {/* Table - Desktop only */}
                <div className='hidden sm:block w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
                    <div className='overflow-x-auto'>
                        <table className='w-full'>
                            <thead>
                                <tr className='border-b border-gray-100'>
                                    <th className='px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10'>
                                        {tTable('name')}
                                    </th>
                                    <th className='px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        {tTable('date')}
                                    </th>
                                    <th className='px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        {tTable('distance')}
                                    </th>
                                    <th className='px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell'>
                                        {tTable('elevation')}
                                    </th>
                                    <th className='px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell'>
                                        {tTable('city')}
                                    </th>
                                    <th className='px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        {tTable('price')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='bg-white divide-y divide-gray-50'>
                                {races.map((race, index) => (
                                    <tr
                                        key={index}
                                        className='hover:bg-gray-50/50 transition-colors duration-150 group'
                                    >
                                        <td className='px-6 py-5 whitespace-nowrap sticky left-0 bg-white group-hover:bg-gray-50/50 z-10'>
                                            <div className='text-sm font-medium text-gray-900'>
                                                {race.name}
                                            </div>
                                        </td>
                                        <td className='px-6 py-5 whitespace-nowrap'>
                                            <div className='text-sm text-gray-700'>
                                                {formatDate(race.date)}
                                            </div>
                                        </td>
                                        <td className='px-6 py-5 whitespace-nowrap'>
                                            <div className='text-sm text-gray-700'>
                                                {race.distanceKm} km
                                            </div>
                                        </td>
                                        <td className='px-6 py-5 whitespace-nowrap hidden md:table-cell'>
                                            <div className='text-sm text-gray-700'>
                                                {formatElevation(race.elevationGainM)}
                                            </div>
                                        </td>
                                        <td className='px-6 py-5 whitespace-nowrap hidden lg:table-cell'>
                                            <div className='text-sm text-gray-700'>
                                                {formatCity(race.city, race.province, false)}
                                            </div>
                                        </td>
                                        <td className='px-6 py-5 whitespace-nowrap text-right'>
                                            <div className='text-sm font-medium text-gray-900'>
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
            <InfoModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={tModal('title')}
                message={tModal('message')}
                closeButtonLabel={tModal('close')}
            />
        </>
    );
}
