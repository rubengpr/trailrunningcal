'use client';

import type { ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { SectionHeader } from '@/components/ui/section-header';
import { TrailRaceCard } from '@/components/race/trail-race-card';
import { RaceManagementTable } from '@/components/race/race-management-table';
import { generateRaceSlug } from '@/lib/races/utils';
import type { TrailRace } from '@/types/race.types';

export interface RaceManagementListLabels {
  name: string;
  date: string;
  distance: string;
  price: string;
}

interface RaceManagementListProps {
  races: TrailRace[];
  onRaceClick?: (raceId: string) => void;
  labels: RaceManagementListLabels;
  headerTitle: string;
  headerSubtitle: string;
  headerAction?: ReactNode;
  placeholderMode?: boolean;
}

export function RaceManagementList({
  races,
  onRaceClick,
  labels,
  headerTitle,
  headerSubtitle,
  headerAction,
  placeholderMode = false,
}: RaceManagementListProps) {
  const locale = useLocale();
  const isClickable = !placeholderMode && !!onRaceClick;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        action={headerAction}
      />

      <div className="w-full sm:hidden space-y-4">
        {races.map((race, index) => (
          <div
            key={race.id || index}
            onClick={isClickable && race.id ? () => onRaceClick?.(race.id) : undefined}
            className={isClickable ? 'cursor-pointer min-w-0' : 'min-w-0'}
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
              displayOnly
            />
          </div>
        ))}
      </div>

      <RaceManagementTable
        races={races}
        labels={labels}
        locale={locale}
        placeholderMode={placeholderMode}
        isClickable={isClickable}
        onRaceClick={onRaceClick}
      />
    </div>
  );
}
