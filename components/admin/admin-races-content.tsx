'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import TrailRaceCard from '@/components/race/trail-race-card';
import type { TrailRace } from '@/types/race.types';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';
import { generateRaceSlug } from '@/lib/race-utils';

interface AdminRacesContentProps {
    races: TrailRace[];
}

export function AdminRacesContent({ races }: AdminRacesContentProps) {
    const t = useTranslations('admin.races.table');
    const locale = useLocale();
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    const handleRaceClick = (raceId: string) => {
        router.push(`/${locale}/admin/carreras/${raceId}`);
    };

    const handleCreateFromScratch = () => {
        setIsDropdownOpen(false);
        router.push(`/${locale}/admin/carreras/new`);
    };

    const formatDate = (dateString: string | null): string => {
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
        <div className='flex flex-col gap-8'>
            <SectionHeader
                title={t('title')}
                subtitle={
                    races.length === 1
                        ? t('raceCountOne')
                        : t('raceCount', { count: races.length })
                }
                action={
                    <div className='relative' ref={dropdownRef}>
                        <Button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            {t('newRaceButton')}
                        </Button>
                        {isDropdownOpen && (
                            <div className='absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 z-20'>
                                <button
                                    onClick={handleCreateFromScratch}
                                    className='w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors'
                                >
                                    {t('createFromScratch')}
                                </button>
                                <div className='px-4 py-3 text-sm text-gray-400 cursor-not-allowed rounded-b-lg flex items-center justify-between'>
                                    <span>{t('crawlWebsite')}</span>
                                    <span className='text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full'>
                                        {t('comingSoon')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                }
            />

            {/* Cards - Mobile only */}
            <div className='w-full sm:hidden space-y-4'>
                {races.map((race) => (
                    <div
                        key={race.id}
                        onClick={() => handleRaceClick(race.id)}
                        className='cursor-pointer'
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
                                <th className='px-6 py-4 text-left text-xs font-medium uppercase tracking-wider sticky left-0 bg-white z-10 text-gray-500'>
                                    {t('name')}
                                </th>
                                <th className='px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                                    {t('date')}
                                </th>
                                <th className='px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                                    {t('distance')}
                                </th>
                                <th className='px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-500'>
                                    {t('price')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className='bg-white divide-y divide-gray-50'>
                            {races.map((race) => (
                                <tr
                                    key={race.id}
                                    onClick={() => handleRaceClick(race.id)}
                                    className='hover:bg-gray-50/50 transition-colors duration-150 group cursor-pointer'
                                >
                                    <td className='px-6 py-5 whitespace-nowrap sticky left-0 bg-white z-10 group-hover:bg-gray-50/50'>
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
    );
}
