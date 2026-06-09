'use client';

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { formatIsoDateNumeric } from '@/lib/utils/date';
import { formatDisplayPrice } from '@/lib/races/utils';
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
  placeholderMode?: boolean;
  isClickable: boolean;
  onRaceClick?: (raceId: string) => void;
}

function RaceManagementTableHeader({
  labels,
  placeholderMode = false,
}: RaceManagementTableHeaderProps) {
  return (
    <TableHeader>
      <TableCell header sticky muted={placeholderMode}>
        {labels.name}
      </TableCell>
      <TableCell header muted={placeholderMode}>
        {labels.date}
      </TableCell>
      <TableCell header muted={placeholderMode}>
        {labels.distance}
      </TableCell>
      <TableCell header align="right" muted={placeholderMode}>
        {labels.price}
      </TableCell>
    </TableHeader>
  );
}

function RaceManagementTableRow({
  race,
  placeholderMode = false,
  isClickable,
  onRaceClick,
}: RaceManagementTableRowProps) {
  return (
    <TableRow
      clickable={isClickable}
      onClick={isClickable && race.id ? () => onRaceClick?.(race.id) : undefined}
    >
      <TableCell
        sticky
        className={`whitespace-nowrap ${isClickable ? 'group-hover:bg-gray-50/50' : ''}`.trim()}
      >
        <div
          className={`text-sm font-medium ${
            placeholderMode ? 'text-gray-300' : 'text-gray-900'
          }`}
        >
          {race.name}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div
          className={`text-sm ${
            placeholderMode ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {formatIsoDateNumeric(race.date) ?? 'N/D'}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div
          className={`text-sm ${
            placeholderMode ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {race.distanceKm} km
        </div>
      </TableCell>
      <TableCell align="right" className="whitespace-nowrap">
        <div
          className={`text-sm font-medium ${
            placeholderMode ? 'text-gray-300' : 'text-gray-900'
          }`}
        >
          {formatDisplayPrice(race.priceEur)}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function RaceManagementTable({
  races,
  labels,
  placeholderMode = false,
  isClickable,
  onRaceClick,
}: RaceManagementTableProps) {
  return (
    <Table className="hidden sm:block">
      <RaceManagementTableHeader labels={labels} placeholderMode={placeholderMode} />
      <TableBody>
        {races.map((race, index) => (
          <RaceManagementTableRow
            key={race.id || index}
            race={race}
            placeholderMode={placeholderMode}
            isClickable={isClickable}
            onRaceClick={onRaceClick}
          />
        ))}
      </TableBody>
    </Table>
  );
}
