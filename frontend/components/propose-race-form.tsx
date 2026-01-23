'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FormInput } from './form-input';

interface ProposeRaceFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function ProposeRaceForm({ onSuccess, onClose }: ProposeRaceFormProps) {
  const t = useTranslations('proposeRace');
  const [raceName, setRaceName] = useState('');
  const [raceWebsite, setRaceWebsite] = useState('');
  const [raceNameError, setRaceNameError] = useState('');
  const [raceWebsiteError, setRaceWebsiteError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateRaceName = (name: string): boolean => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setRaceNameError(t('errors.raceNameRequired'));
      return false;
    }
    if (trimmedName.length > 200) {
      setRaceNameError(t('errors.raceNameTooLong'));
      return false;
    }
    setRaceNameError('');
    return true;
  };

  const validateRaceWebsite = (website: string): boolean => {
    const trimmedWebsite = website.trim();
    if (!trimmedWebsite) {
      setRaceWebsiteError(t('errors.raceWebsiteRequired'));
      return false;
    }
    if (trimmedWebsite.length > 200) {
      setRaceNameError(t('errors.raceWebsiteTooLong'));
      return false;
    }
    try {
      new URL(trimmedWebsite);
      setRaceWebsiteError('');
      return true;
    } catch {
      setRaceWebsiteError(t('errors.raceWebsiteInvalid'));
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isRaceNameValid = validateRaceName(raceName);
    const isRaceWebsiteValid = validateRaceWebsite(raceWebsite);

    if (!isRaceNameValid || !isRaceWebsiteValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/propose-race', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raceName: raceName.trim(),
          raceWebsite: raceWebsite.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errors.general'));
      }

      onSuccess();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('errors.general'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-6">
        <FormInput
          id="raceName"
          label={t('raceName')}
          type="text"
          value={raceName}
          onChange={(e) => {
            setRaceName(e.target.value);
            setRaceNameError('');
            setError(null);
          }}
          error={raceNameError}
          placeholder='Ultra Pirineu'
        />
        <FormInput
          id="raceWebsite"
          label={t('raceWebsite')}
          type="url"
          value={raceWebsite}
          onChange={(e) => {
            setRaceWebsite(e.target.value);
            setRaceWebsiteError('');
            setError(null);
          }}
          error={raceWebsiteError}
          placeholder='https://ultrapirineu.com/es/'
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
            disabled={isLoading}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="flex-1 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? t('submitting') : t('submit')}
          </button>
        </div>
      </div>
    </form>
  );
}
