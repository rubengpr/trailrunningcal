'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { FormInput } from '@/components/ui/form-input';
import { FormTextarea } from '@/components/ui/form-textarea';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useModal } from '@/hooks/use-modal';
import {
  acceptScrapedEvent,
  deleteEvent,
  updateEvent,
  updateOrganizerEvent,
} from '@/lib/api/events';
import type { EventRaceWriteInput } from '@/lib/api/events';
import type { TrailEventDetail } from '@/types/event.types';

interface RaceDraft {
  id?: string;
  name: string;
  date: string;
  city: string;
  province: string;
  distanceKm: string;
  elevationGainM: string;
}

const emptyRace = (): RaceDraft => ({
  name: '',
  date: '',
  city: '',
  province: '',
  distanceKm: '',
  elevationGainM: '',
});

function toRaceDrafts(initialData: TrailEventDetail | null): RaceDraft[] {
  if (!initialData || initialData.races.length === 0) {
    return [emptyRace()];
  }

  return initialData.races.map((race) => ({
    id: race.id,
    name: race.name ?? '',
    date: race.date ?? '',
    city: race.city,
    province: race.province,
    distanceKm: String(race.distanceKm),
    elevationGainM: race.elevationGainM != null ? String(race.elevationGainM) : '',
  }));
}

function parseOptionalInteger(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

interface EventFormProps {
  eventId?: string;
  initialData?: TrailEventDetail | null;
  isEditMode?: boolean;
  apiMode?: 'admin' | 'organizer';
}

export function EventForm({
  eventId,
  initialData = null,
  isEditMode = false,
  apiMode = 'admin',
}: EventFormProps): React.ReactElement {
  const t = useTranslations('adminEvents.form');
  const deleteT = useTranslations('adminEvents.delete');
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState(initialData?.event.name ?? '');
  const [description, setDescription] = useState(initialData?.event.description ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.event.websiteUrl ?? '');
  const [races, setRaces] = useState<RaceDraft[]>(() => toRaceDrafts(initialData));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isOpen: isDeleteModalOpen, open: openDeleteModal, close: closeDeleteModal } = useModal();
  const canDelete = apiMode === 'admin' && isEditMode;

  const updateRace = (
    index: number,
    field: keyof RaceDraft,
    value: string,
  ): void => {
    setRaces((current) =>
      current.map((race, raceIndex) =>
        raceIndex === index ? { ...race, [field]: value } : race,
      ),
    );
  };

  const removeRace = (index: number): void => {
    setRaces((current) => current.filter((_, raceIndex) => raceIndex !== index));
  };

  const validate = (): string | null => {
    if (name.trim().length < 5) return t('errors.eventName');
    if (websiteUrl.trim().length > 0) {
      try {
        new URL(websiteUrl.trim());
      } catch {
        return t('errors.websiteUrl');
      }
    }
    if (races.length === 0) return t('errors.races');

    for (const race of races) {
      if (!race.city.trim()) return t('errors.city');
      if (!race.province.trim()) return t('errors.province');
      const distance = Number(race.distanceKm);
      if (!Number.isFinite(distance) || distance <= 0 || distance >= 1000) {
        return t('errors.distance');
      }
      const elevationGainM = parseOptionalInteger(race.elevationGainM);
      if (
        elevationGainM !== null &&
        (!Number.isInteger(elevationGainM) ||
          elevationGainM <= 0 ||
          elevationGainM >= 100000)
      ) {
        return t('errors.elevation');
      }
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const parsedRaces: EventRaceWriteInput[] = races.map((race) => ({
        ...(race.id ? { id: race.id } : {}),
        name: race.name.trim() || null,
        date: race.date.trim() || null,
        city: race.city.trim(),
        province: race.province.trim(),
        distanceKm: Number(race.distanceKm),
        elevationGainM: parseOptionalInteger(race.elevationGainM),
      }));

      if (isEditMode && eventId) {
        const update = apiMode === 'organizer' ? updateOrganizerEvent : updateEvent;

        await update(
          eventId,
          {
            name: name.trim(),
            description: description.trim() || null,
            websiteUrl: websiteUrl.trim() || null,
          },
          parsedRaces,
        );
        toast.success(t('success'));
        router.refresh();
        return;
      }

      await acceptScrapedEvent(
        {
          name: name.trim(),
          description: description.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
        },
        parsedRaces,
      );
      toast.success(t('success'));
      router.push(`/${locale}/admin/eventos/activos`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.save');
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!eventId || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteEvent(eventId);
      toast.success(deleteT('success'));
      router.push(`/${locale}/admin/eventos/activos`);
    } catch {
      toast.error(deleteT('error'));
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-10 p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-semibold leading-none tracking-tight">
          {isEditMode ? t('editTitle') : t('title')}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
          <FormInput
            id="event-name"
            label={t('eventName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <FormInput
            id="event-website-url"
            label={t('websiteUrl')}
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder={t('websiteUrlPlaceholder')}
          />
        </div>
        <FormTextarea
          id="event-description"
          label={t('description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          showCharacterCount
          rows={5}
        />
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold leading-none tracking-tight">{t('racesTitle')}</h3>
          <button
            type="button"
            onClick={() => setRaces((current) => [...current, emptyRace()])}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none cursor-pointer"
          >
            <Plus className="size-4" strokeWidth={2} />
            {t('addRace')}
          </button>
        </div>

        {races.map((race, index) => (
          <div key={race.id ?? index} className="flex flex-col gap-4 border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-gray-900">
                {t('raceTitle', { number: index + 1 })}
              </h3>
              {races.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRace(index)}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none cursor-pointer"
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                  {t('removeRace')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
              <FormInput
                id={`race-name-${index}`}
                label={t('raceName')}
                value={race.name}
                onChange={(e) => updateRace(index, 'name', e.target.value)}
              />
              <FormInput
                id={`race-date-${index}`}
                label={t('date')}
                type="date"
                value={race.date}
                onChange={(e) => updateRace(index, 'date', e.target.value)}
              />
              <FormInput
                id={`race-city-${index}`}
                label={t('city')}
                value={race.city}
                onChange={(e) => updateRace(index, 'city', e.target.value)}
              />
              <FormInput
                id={`race-province-${index}`}
                label={t('province')}
                value={race.province}
                onChange={(e) => updateRace(index, 'province', e.target.value)}
              />
              <FormInput
                id={`race-distance-${index}`}
                label={t('distanceKm')}
                inputMode="decimal"
                value={race.distanceKm}
                onChange={(e) => updateRace(index, 'distanceKm', e.target.value)}
              />
              <FormInput
                id={`race-elevation-${index}`}
                label={t('elevationGainM')}
                inputMode="numeric"
                value={race.elevationGainM}
                onChange={(e) => updateRace(index, 'elevationGainM', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {canDelete && (
          <button
            type="button"
            onClick={openDeleteModal}
            disabled={isSaving || isDeleting}
            className="inline-flex items-center justify-center rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? deleteT('deleting') : deleteT('button')}
          </button>
        )}
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          disabled={isSaving || isDeleting}
        >
          {isSaving ? t('saving') : t('save')}
        </button>
      </div>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={deleteT('confirmTitle')}
        message={deleteT('confirmDescription', {
          name: name.trim() || initialData?.event.name || '',
          count: initialData?.allRaceCount ?? races.length,
        })}
        confirmButtonText={deleteT('confirmButton')}
        cancelButtonText={deleteT('cancelButton')}
        isSubmitting={isDeleting}
      />
    </form>
  );
}
