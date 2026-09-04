'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RaceTrackUpload } from '@/components/admin/race-track-upload';
import { ReviewActionButton } from '@/components/admin/review-action-button';
import { RaceDraftFields } from '@/components/event/race-draft-fields';
import { RaceTierFields } from '@/components/event/race-tier-fields';
import type { RaceTierDraft } from '@/components/event/race-tier-fields';
import type { EventRaceWriteInput } from '@/lib/api/events';

export type ModalRaceDraft = Omit<EventRaceWriteInput, 'distanceKm' | 'elevationGainM' | 'tiers'> & { distanceKm: string; elevationGainM: string; tierDrafts: RaceTierDraft[] };

interface RaceEditModalRowProps { race: ModalRaceDraft; index: number; raceCount: number; isSaving: boolean; showResultsUrls: boolean; showTrackUploads: boolean; showTiers: boolean; trackedRaceIds: string[]; onChange: (race: ModalRaceDraft) => void; onRemove: () => void; onTrackUploaded?: (raceId: string) => void; }

export function RaceEditModalRow({ race, index, raceCount, isSaving, showResultsUrls, showTrackUploads, showTiers, trackedRaceIds, onChange, onRemove, onTrackUploaded }: RaceEditModalRowProps): React.ReactElement {
  const t = useTranslations('admin.events.import.results'); const formT = useTranslations('adminEvents.form');
  return <div className="flex flex-col gap-3 py-8 first:pt-0 last:pb-0"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-semibold tabular-nums text-gray-600">{index + 1}</span><p className="min-w-0 truncate text-sm font-semibold text-gray-900">{race.name?.trim() || t('raceTitle', { number: index + 1 })}</p></div><ReviewActionButton title={t('removeRace')} disabled={isSaving || raceCount <= 1} onClick={onRemove}><Trash2 className="h-4 w-4" aria-hidden="true" /></ReviewActionButton></div>
    <RaceDraftFields idPrefix={`modal-race-${index}`} name={race.name ?? ''} date={race.date ?? ''} city={race.city} province={race.province} distanceKm={race.distanceKm} elevationGainM={race.elevationGainM} resultsUrl={race.resultsUrl ?? ''} showResultsUrl={showResultsUrls && Boolean(race.id)} disabled={isSaving} layout="modal" labels={{ name: t('editFieldName'), date: t('editFieldDate'), city: t('editFieldCity'), province: t('editFieldProvince'), provincePlaceholder: formT('provincePlaceholder'), distance: t('editFieldDistance'), elevation: t('editFieldElevation'), resultsUrl: formT('resultsUrl'), resultsUrlPlaceholder: formT('resultsUrlPlaceholder') }} onFieldChange={(field, value) => onChange({ ...race, [field]: field === 'date' ? value || null : value })} />
    {showTrackUploads && <RaceTrackUpload raceId={race.id} raceName={race.name ?? ''} initialHasTrack={race.id ? trackedRaceIds.includes(race.id) : false} disabled={isSaving} onUploaded={(result) => onTrackUploaded?.(result.raceId)} />}
    {showTiers && <RaceTierFields idPrefix={`modal-race-${index}`} tiers={race.tierDrafts} disabled={isSaving} onChange={(tierDrafts) => onChange({ ...race, tierDrafts })} />}
  </div>;
}
