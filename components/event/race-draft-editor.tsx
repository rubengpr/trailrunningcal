'use client';

import { Trash2 } from 'lucide-react';
import { RaceTrackUpload } from '@/components/admin/race-track-upload';
import {
  RaceDraftFields,
  type RaceDraftField,
} from '@/components/event/race-draft-fields';
import { RaceTierFields } from '@/components/event/race-tier-fields';
import type { RaceTierDraft } from '@/components/event/race-tier-fields';

export interface RaceDraft {
  id?: string;
  name: string;
  date: string;
  city: string;
  province: string;
  distanceKm: string;
  elevationGainM: string;
  resultsUrl: string;
  tiers: RaceTierDraft[];
}

interface RaceDraftEditorLabels {
  title: string;
  remove: string;
  name: string;
  date: string;
  city: string;
  province: string;
  provincePlaceholder: string;
  distance: string;
  elevation: string;
  resultsUrl: string;
  resultsUrlPlaceholder: string;
}

interface RaceDraftEditorProps {
  race: RaceDraft;
  index: number;
  raceCount: number;
  isEditMode: boolean;
  apiMode: 'admin' | 'organizer';
  isSaving: boolean;
  isDeleting: boolean;
  hasTrack: boolean;
  labels: RaceDraftEditorLabels;
  onChange: (field: RaceDraftField, value: string) => void;
  onRemove: () => void;
  onTiersChange: (tiers: RaceTierDraft[]) => void;
}

export function RaceDraftEditor({
  race,
  index,
  raceCount,
  isEditMode,
  apiMode,
  isSaving,
  isDeleting,
  hasTrack,
  labels,
  onChange,
  onRemove,
  onTiersChange,
}: RaceDraftEditorProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-gray-900">
          {labels.title}
        </h3>
        {raceCount > 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none"
          >
            <Trash2 className="size-4" strokeWidth={2} />
            {labels.remove}
          </button>
        )}
      </div>
      <RaceDraftFields
        idPrefix={`race-${index}`}
        name={race.name}
        date={race.date}
        city={race.city}
        province={race.province}
        distanceKm={race.distanceKm}
        elevationGainM={race.elevationGainM}
        resultsUrl={race.resultsUrl}
        showResultsUrl={isEditMode && Boolean(race.id)}
        labels={labels}
        onFieldChange={onChange}
      />
      <RaceTierFields
        idPrefix={`race-${index}`}
        tiers={race.tiers}
        disabled={isSaving}
        onChange={onTiersChange}
      />
      {apiMode === 'admin' && isEditMode && (
        <RaceTrackUpload
          raceId={race.id}
          raceName={race.name}
          initialHasTrack={hasTrack}
          disabled={isSaving || isDeleting}
        />
      )}
    </div>
  );
}
