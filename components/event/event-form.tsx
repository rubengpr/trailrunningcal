'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { FormTextarea } from '@/components/ui/form-textarea';
import { acceptScrapedEvent } from '@/lib/api/events';
import type { TrailEventAgentRace } from '@/types/trail-event-agent.types';

interface RaceDraft {
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

function parseOptionalInteger(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export function EventForm(): React.ReactElement {
  const t = useTranslations('adminEvents.form');
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [races, setRaces] = useState<RaceDraft[]>([emptyRace()]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      if (race.name.trim().length < 5) return t('errors.raceName');
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
      const parsedRaces: TrailEventAgentRace[] = races.map((race) => ({
        name: race.name.trim(),
        date: race.date.trim() || null,
        city: race.city.trim(),
        province: race.province.trim(),
        distanceKm: Number(race.distanceKm),
        elevationGainM: parseOptionalInteger(race.elevationGainM),
      }));

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

  return (
    <form onSubmit={handleSubmit} className="flex max-w-4xl flex-col gap-8">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4">
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
          <FormTextarea
            id="event-description"
            label={t('description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">{t('racesTitle')}</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRaces((current) => [...current, emptyRace()])}
          >
            <Plus className="size-4" strokeWidth={2} />
            {t('addRace')}
          </Button>
        </div>

        {races.map((race, index) => (
          <div key={index} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-gray-900">
                {t('raceTitle', { number: index + 1 })}
              </h3>
              {races.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => removeRace(index)}
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                  {t('removeRace')}
                </Button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
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

      <div className="flex gap-2">
        <Button type="submit" isLoading={isSaving} loadingText={t('saving')}>
          {t('save')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(`/${locale}/admin/eventos/activos`)}
        >
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
