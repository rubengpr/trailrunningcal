'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { FormInput } from './form-input';
import type { TrailRace } from '@/types/race.types';
import { updateRace } from '@/lib/api/races';
import { updatePrice } from '@/lib/api/race_tiers';

interface RaceFormProps {
    raceId: string;
    initialData: TrailRace | null;
    isEditMode: boolean;
}

export function RaceForm({ raceId, initialData, isEditMode }: RaceFormProps) {
    const t = useTranslations('organizer.races.form');
    const [date, setDate] = useState(initialData?.date ?? '');
    const [name, setName] = useState(initialData?.name ?? '');
    const [distanceKm, setDistanceKm] = useState<string>(initialData != null ? String(initialData.distanceKm) : '');
    const [elevationGainM, setElevationGainM] = useState<string>(initialData?.elevationGainM != null ? String(initialData.elevationGainM) : '');
    const [priceEur, setPriceEur] = useState<string>(
        initialData?.priceEur && Array.isArray(initialData.priceEur) && initialData.priceEur.length > 0
            ? String(initialData.priceEur[0].price_eur)
            : ''
    );
    const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl ?? '');

    const [dateError, setDateError] = useState('');
    const [nameError, setNameError] = useState('');
    const [distanceKmError, setDistanceKmError] = useState('');
    const [elevationGainMError, setElevationGainMError] = useState('');
    const [priceEurError, setPriceEurError] = useState('');
    const [websiteUrlError, setWebsiteUrlError] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const validateName = (value: string): boolean => {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
            setNameError(t('errors.nameRequired'));
            return false;
        }
        if (trimmedValue.length < 5) {
            setNameError(t('errors.nameTooShort'));
            return false;
        }
        if (trimmedValue.length > 200) {
            setNameError(t('errors.nameTooLong'));
            return false;
        }
        setNameError('');
        return true;
    };

    const validateDate = (value: string): boolean => {
        if (!value) {
            setDateError(t('errors.dateRequired'));
            return false;
        }
        setDateError('');
        return true;
    };

    const validateDistanceKm = (value: string): boolean => {
        if (!value || value.trim() === '') {
            setDistanceKmError(t('errors.distanceRequired'));
            return false;
        }
        // Check for leading zeros (invalid: 0000005, 05, etc.)
        // But allow 0.5 or 0,5 (decimal values)
        const trimmedValue = value.trim();
        const decimalIndex = trimmedValue.indexOf(',') !== -1 ? trimmedValue.indexOf(',') : trimmedValue.indexOf('.');
        const integerPart = decimalIndex !== -1 ? trimmedValue.substring(0, decimalIndex) : trimmedValue;

        // Check if integer part has leading zeros (more than one zero or zero followed by digits)
        if (integerPart.length > 1 && integerPart.startsWith('0')) {
            setDistanceKmError(t('errors.distanceInvalid'));
            return false;
        }

        // Replace comma with dot for parsing (European format)
        const normalizedValue = trimmedValue.replace(',', '.');
        const numValue = parseFloat(normalizedValue);
        if (isNaN(numValue) || numValue <= 0) {
            setDistanceKmError(t('errors.distanceInvalid'));
            return false;
        }
        if (numValue >= 1000) {
            setDistanceKmError(t('errors.distanceTooLong'));
            return false;
        }
        setDistanceKmError('');
        return true;
    };

    const validateElevationGainM = (value: string): boolean => {
        if (!value || value.trim() === '') {
            setElevationGainMError(t('errors.elevationRequired'));
            return false;
        }

        const trimmedValue = value.trim();

        // Check for decimals (not allowed)
        if (trimmedValue.includes('.') || trimmedValue.includes(',')) {
            setElevationGainMError(t('errors.elevationInvalid'));
            return false;
        }

        // Check for leading zeros
        if (trimmedValue.length > 1 && trimmedValue.startsWith('0')) {
            setElevationGainMError(t('errors.elevationInvalid'));
            return false;
        }

        const numValue = parseInt(trimmedValue, 10);
        if (isNaN(numValue) || numValue <= 0) {
            setElevationGainMError(t('errors.elevationInvalid'));
            return false;
        }
        if (numValue >= 100000) {
            setElevationGainMError(t('errors.elevationTooLong'));
            return false;
        }
        setElevationGainMError('');
        return true;
    };

    const validatePriceEur = (value: string): boolean => {
        if (!value || value.trim() === '') {
            setPriceEurError(t('errors.priceRequired'));
            return false;
        }

        const trimmedValue = value.trim();
        const numValue = parseInt(trimmedValue, 10);

        if (isNaN(numValue) || numValue < 0) {
            setPriceEurError(t('errors.priceInvalid'));
            return false;
        }
        if (numValue >= 1000) {
            setPriceEurError(t('errors.priceTooLong'));
            return false;
        }
        // Check if it's a whole number (no decimals)
        if (trimmedValue.includes(',') || trimmedValue.includes('.')) {
            setPriceEurError(t('errors.priceInvalid'));
            return false;
        }
        setPriceEurError('');
        return true;
    };

    const validateWebsiteUrl = (value: string): boolean => {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
            setWebsiteUrlError(t('errors.websiteUrlRequired'));
            return false;
        }

        // Normalize URL: prepend https:// if no protocol is present
        let normalizedUrl = trimmedValue;
        if (!trimmedValue.startsWith('http://') && !trimmedValue.startsWith('https://')) {
            normalizedUrl = `https://${trimmedValue}`;
            // Update the input field with the normalized URL
            setWebsiteUrl(normalizedUrl);
        }

        try {
            const url = new URL(normalizedUrl);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                setWebsiteUrlError(t('errors.websiteUrlInvalid'));
                return false;
            }
        } catch {
            setWebsiteUrlError(t('errors.websiteUrlInvalid'));
            return false;
        }

        setWebsiteUrlError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const isNameValid = validateName(name);
        const isDateValid = validateDate(date);
        const isDistanceKmValid = validateDistanceKm(distanceKm);
        const isElevationGainMValid = validateElevationGainM(elevationGainM);
        const isPriceEurValid = validatePriceEur(priceEur);
        const isWebsiteUrlValid = validateWebsiteUrl(websiteUrl);

        if (!isNameValid || !isDateValid || !isDistanceKmValid || !isElevationGainMValid || !isPriceEurValid || !isWebsiteUrlValid) {
            return;
        }

        setIsLoading(true);

        try {
            await updateRace(raceId, date, name, distanceKm, elevationGainM, websiteUrl)
            await updatePrice({ raceId, priceEur: parseInt(priceEur, 10) })

            toast.success(t('success'));

            // Clear form only if creating new race
            if (!isEditMode) {
                setDate('');
                setName('');
                setDistanceKm('');
                setElevationGainM('');
                setPriceEur('');
                setWebsiteUrl('');
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : t('errors.general');
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className='flex flex-col p-4 md:p-6 gap-14 md:gap-10'>
            <div className='flex flex-col gap-4'>
                <h3 className="text-xl font-semibold leading-none tracking-tight">
                    {isEditMode ? t('editTitle') : t('title')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    <FormInput
                        id='name'
                        label={t('name')}
                        type='text'
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setNameError('');
                            setError('');
                        }}
                        error={nameError}
                    />
                    <FormInput
                        id='date'
                        label={t('date')}
                        type='date'
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value);
                            setDateError('');
                            setError('');
                        }}
                        error={dateError}
                    />
                    <FormInput
                        id='distanceKm'
                        label={t('distanceKm')}
                        type='text'
                        inputMode='decimal'
                        value={distanceKm}
                        onChange={(e) => {
                            // Allow comma as decimal separator, normalize dots to commas
                            let inputValue = e.target.value.replace(/[^0-9,.]/g, '').replace(/\./g, ',');
                            // Ensure only one comma
                            const commaIndex = inputValue.indexOf(',');
                            if (commaIndex !== -1) {
                                inputValue = inputValue.substring(0, commaIndex + 1) + inputValue.substring(commaIndex + 1).replace(/,/g, '');
                            }
                            setDistanceKm(inputValue);
                            setDistanceKmError('');
                            setError('');
                        }}
                        error={distanceKmError}
                    />
                    <FormInput
                        id='elevationGainM'
                        label={t('elevationGainM')}
                        type='text'
                        inputMode='numeric'
                        value={elevationGainM}
                        onChange={(e) => {
                            // Only allow digits, no decimals or thousand separators
                            let inputValue = e.target.value.replace(/[^0-9]/g, '');
                            // Remove leading zeros (but allow single "0")
                            if (inputValue.length > 1) {
                                inputValue = inputValue.replace(/^0+/, '') || '';
                            }
                            setElevationGainM(inputValue);
                            setElevationGainMError('');
                            setError('');
                        }}
                        error={elevationGainMError}
                    />
                    <FormInput
                        id='priceEur'
                        label={t('priceEur')}
                        type='text'
                        inputMode='numeric'
                        value={priceEur}
                        onChange={(e) => {
                            // Only allow whole numbers (no decimals)
                            const inputValue = e.target.value.replace(/[^0-9]/g, '');
                            setPriceEur(inputValue);
                            setPriceEurError('');
                            setError('');
                        }}
                        error={priceEurError}
                    />
                    <FormInput
                        id='websiteUrl'
                        label={t('websiteUrl')}
                        type='url'
                        value={websiteUrl}
                        placeholder={t('websiteUrlPlaceholder')}
                        onChange={(e) => {
                            setWebsiteUrl(e.target.value);
                            setWebsiteUrlError('');
                            setError('');
                        }}
                        error={websiteUrlError}
                    />
                </div>
            </div>
            <div className='flex justify-end'>
                <button
                    type='submit'
                    className='inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer'
                    disabled={isLoading}
                >
                    {isLoading ? t('saving') : t('save')}
                </button>
            </div>
            {error && (
                <p className='text-sm text-red-500'>{error}</p>
            )}
        </form>
    );
}
