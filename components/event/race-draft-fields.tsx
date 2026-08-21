'use client';

import { FormInput } from '@/components/ui/form-input';
import { SelectMenu } from '@/components/ui/select-menu';
import { PROVINCES } from '@/lib/geography/provinces';

const provinceOptions = PROVINCES.map((province) => ({
  value: province,
  label: province,
}));

export type RaceDraftField =
  | 'name'
  | 'date'
  | 'city'
  | 'province'
  | 'distanceKm'
  | 'elevationGainM'
  | 'resultsUrl';

interface RaceDraftFieldLabels {
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

interface RaceDraftFieldsProps {
  idPrefix: string;
  name: string;
  date: string;
  city: string;
  province: string;
  distanceKm: string;
  elevationGainM: string;
  resultsUrl?: string;
  showResultsUrl?: boolean;
  disabled?: boolean;
  labels: RaceDraftFieldLabels;
  layout?: 'page' | 'modal';
  onFieldChange: (field: RaceDraftField, value: string) => void;
}

export function RaceDraftFields({
  idPrefix,
  name,
  date,
  city,
  province,
  distanceKm,
  elevationGainM,
  resultsUrl = '',
  showResultsUrl = false,
  disabled = false,
  labels,
  layout = 'page',
  onFieldChange,
}: RaceDraftFieldsProps): React.ReactElement {
  const isModal = layout === 'modal';
  const gridClassName = isModal ? 'grid gap-3 sm:grid-cols-3' : 'grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8';
  const locationGridClassName = isModal ? 'grid gap-3 sm:grid-cols-2' : gridClassName;

  if (isModal) {
    return (
      <>
        <FormInput id={`${idPrefix}-name`} label={labels.name} value={name} disabled={disabled} onChange={(event) => onFieldChange('name', event.target.value)} />
        <div className={gridClassName}>
          <FormInput id={`${idPrefix}-date`} label={labels.date} type="date" value={date} disabled={disabled} onChange={(event) => onFieldChange('date', event.target.value)} />
          <FormInput id={`${idPrefix}-distance`} label={labels.distance} inputMode="decimal" value={distanceKm} disabled={disabled} onChange={(event) => onFieldChange('distanceKm', event.target.value)} />
          <FormInput id={`${idPrefix}-elevation`} label={labels.elevation} inputMode="numeric" value={elevationGainM} disabled={disabled} onChange={(event) => onFieldChange('elevationGainM', event.target.value)} />
        </div>
        <div className={locationGridClassName}>
          <FormInput id={`${idPrefix}-city`} label={labels.city} value={city} disabled={disabled} onChange={(event) => onFieldChange('city', event.target.value)} />
          <SelectMenu id={`${idPrefix}-province`} label={labels.province} value={province} options={provinceOptions} disabled={disabled} placeholder={labels.provincePlaceholder} variant="modal" onValueChange={(value) => onFieldChange('province', value)} />
        </div>
        {showResultsUrl ? <FormInput id={`${idPrefix}-results-url`} label={labels.resultsUrl} type="url" value={resultsUrl} placeholder={labels.resultsUrlPlaceholder} disabled={disabled} onChange={(event) => onFieldChange('resultsUrl', event.target.value)} /> : null}
      </>
    );
  }

  return (
    <div className={gridClassName}>
      <FormInput id={`${idPrefix}-name`} label={labels.name} value={name} disabled={disabled} onChange={(event) => onFieldChange('name', event.target.value)} />
      <FormInput id={`${idPrefix}-date`} label={labels.date} type="date" value={date} disabled={disabled} onChange={(event) => onFieldChange('date', event.target.value)} />
      <FormInput id={`${idPrefix}-city`} label={labels.city} value={city} disabled={disabled} onChange={(event) => onFieldChange('city', event.target.value)} />
      <SelectMenu id={`${idPrefix}-province`} label={labels.province} value={province} options={provinceOptions} disabled={disabled} placeholder={labels.provincePlaceholder} onValueChange={(value) => onFieldChange('province', value)} />
      <FormInput id={`${idPrefix}-distance`} label={labels.distance} inputMode="decimal" value={distanceKm} disabled={disabled} onChange={(event) => onFieldChange('distanceKm', event.target.value)} />
      <FormInput id={`${idPrefix}-elevation`} label={labels.elevation} inputMode="numeric" value={elevationGainM} disabled={disabled} onChange={(event) => onFieldChange('elevationGainM', event.target.value)} />
      {showResultsUrl ? <div className="md:col-span-2"><FormInput id={`${idPrefix}-results-url`} label={labels.resultsUrl} type="url" value={resultsUrl} placeholder={labels.resultsUrlPlaceholder} disabled={disabled} onChange={(event) => onFieldChange('resultsUrl', event.target.value)} /></div> : null}
    </div>
  );
}
