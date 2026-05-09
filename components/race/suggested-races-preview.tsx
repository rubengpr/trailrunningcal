'use client';

import { useTranslations } from 'next-intl';
import type { TrailRace } from '@/types/trail-race-agent.types';
import { SuggestedRaceCard } from '@/components/race/suggested-race-card';

interface SuggestedRacesPreviewProps {
    races: TrailRace[];
    isLoading: boolean;
    error: string | null;
    emptyMessage?: string | null;
    onAccept: (index: number) => Promise<void>;
    acceptedIndexes: Set<number>;
    acceptingIndex: number | null;
    onReject: (index: number) => void;
    rejectedIndexes: Set<number>;
    onSave: (index: number, race: TrailRace) => void;
}

export function SuggestedRacesPreview({ races, isLoading, error, emptyMessage, onAccept, acceptedIndexes, acceptingIndex, onReject, rejectedIndexes, onSave }: SuggestedRacesPreviewProps) {
    const t = useTranslations('admin.races.import.results');

    if (isLoading) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <div className="pipeline-loading-dot inline-block h-4 w-4 rounded-full bg-gray-300 mb-3" />
                <p className="text-sm text-gray-600">{t('loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-sm font-medium text-red-800">{t('errorTitle')}</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
        );
    }

    if (races.length === 0) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-sm font-medium text-red-800">{t('noResultsTitle')}</p>
                {emptyMessage && <p className="text-sm text-red-600 mt-1">{emptyMessage}</p>}
            </div>
        );
    }

    const visibleRaces = races
        .map((race, index) => ({ race, index }))
        .filter(({ index }) => !rejectedIndexes.has(index));

    if (visibleRaces.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-sm text-gray-600">{t('noResults')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    {visibleRaces.length}
                </span>
            </div>
            <div className="flex flex-col gap-4">
                {visibleRaces.map(({ race, index }) => (
                    <SuggestedRaceCard
                        key={`${race.name}-${index}`}
                        race={race}
                        onAccept={() => onAccept(index)}
                        isAccepted={acceptedIndexes.has(index)}
                        isAccepting={acceptingIndex === index}
                        isDisabled={acceptingIndex !== null && acceptingIndex !== index}
                        onReject={() => onReject(index)}
                        onSave={(updatedRace) => onSave(index, updatedRace)}
                    />
                ))}
            </div>
        </div>
    );
}
