'use client';

import {
  formatDateByLocale,
} from '@/lib/date-utils';
import { formatDisplayPrice } from '@/lib/race-utils';
import type { TrailRace } from '@/types/race.types';

export interface RaceManagementTableLabels {
  name: string;
  date: string;
  distance: string;
  price: string;
}

export interface RaceManagementTableProps {
  races: TrailRace[];
  labels: RaceManagementTableLabels;
  locale: string;
  placeholderMode?: boolean;
  isClickable: boolean;
  onRaceClick?: (raceId: string) => void;
}

interface RaceManagementTableHeaderProps {
  labels: RaceManagementTableLabels;
  placeholderMode?: boolean;
}

interface RaceManagementTableRowProps {
  race: TrailRace;
  locale: string;
  placeholderMode?: boolean;
  isClickable: boolean;
  onRaceClick?: (raceId: string) => void;
}

function RaceManagementTableHeader({
  labels,
  placeholderMode = false,
}: RaceManagementTableHeaderProps) {
  return (
    <thead>
      <tr className="border-b border-gray-100">
        <th
          className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider sticky left-0 bg-white z-10 ${
            placeholderMode ? 'text-gray-300' : 'text-gray-500'
          }`}
        >
          {labels.name}
        </th>
        <th
          className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
            placeholderMode ? 'text-gray-300' : 'text-gray-500'
          }`}
        >
          {labels.date}
        </th>
        <th
          className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
            placeholderMode ? 'text-gray-300' : 'text-gray-500'
          }`}
        >
          {labels.distance}
        </th>
        <th
          className={`px-6 py-4 text-right text-xs font-medium uppercase tracking-wider ${
            placeholderMode ? 'text-gray-300' : 'text-gray-500'
          }`}
        >
          {labels.price}
        </th>
      </tr>
    </thead>
  );
}

function RaceManagementTableRow({
  race,
  locale,
  placeholderMode = false,
  isClickable,
  onRaceClick,
}: RaceManagementTableRowProps) {
  return (
    <tr
      onClick={isClickable && race.id ? () => onRaceClick?.(race.id) : undefined}
      className={isClickable ? 'hover:bg-gray-50/50 transition-colors duration-150 group cursor-pointer' : ''}
    >
      <td
        className={`px-6 py-5 whitespace-nowrap sticky left-0 bg-white z-10 ${
          isClickable ? 'group-hover:bg-gray-50/50' : ''
        }`}
      >
        <div
          className={`text-sm font-medium ${
            placeholderMode ? 'text-gray-300' : 'text-gray-900'
          }`}
        >
          {race.name}
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <div
          className={`text-sm ${
            placeholderMode ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {formatDateByLocale(race.date, locale)}
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <div
          className={`text-sm ${
            placeholderMode ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {race.distanceKm} km
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap text-right">
        <div
          className={`text-sm font-medium ${
            placeholderMode ? 'text-gray-300' : 'text-gray-900'
          }`}
        >
          {formatDisplayPrice(race.priceEur)}
        </div>
      </td>
    </tr>
  );
}

export function RaceManagementTable({
  races,
  labels,
  locale,
  placeholderMode = false,
  isClickable,
  onRaceClick,
}: RaceManagementTableProps) {
  return (
    <div className="hidden sm:block w-full bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <RaceManagementTableHeader labels={labels} placeholderMode={placeholderMode} />
          <tbody className="bg-white divide-y divide-gray-50">
            {races.map((race, index) => (
              <RaceManagementTableRow
                key={race.id || index}
                race={race}
                locale={locale}
                placeholderMode={placeholderMode}
                isClickable={isClickable}
                onRaceClick={onRaceClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
