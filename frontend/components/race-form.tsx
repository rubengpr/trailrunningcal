'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { FormInput } from './form-input';
import { FormTextarea } from './form-textarea';
import type { TrailRace } from '@/types/race.types';
import { updateRace } from '@/lib/api/races';
import { updatePrice } from '@/lib/api/race_tiers';
import { ValidationRules, normalizeUrl, type FieldErrors } from '@/lib/validation';

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
    const [priceEur, setPriceEur] = useState<string>(initialData != null ? String(initialData.priceEur) : '');
    const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl ?? '');
    const [description, setDescription] = useState(initialData?.description ?? '');

    const [errors, setErrors] = useState<FieldErrors>({});
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Validation rules configuration
    const getValidationRules = () => ({
        name: [
            ValidationRules.required(t('errors.nameRequired')),
            ValidationRules.minLength(5, t('errors.nameTooShort')),
            ValidationRules.maxLength(200, t('errors.nameTooLong')),
        ],
        date: [
            ValidationRules.required(t('errors.dateRequired')),
        ],
        distanceKm: [
            ValidationRules.required(t('errors.distanceRequired')),
            ValidationRules.noLeadingZeros(t('errors.distanceInvalid')),
            ValidationRules.numericRange(0.01, 1000, t('errors.distanceInvalid')),
        ],
        elevationGainM: [
            ValidationRules.required(t('errors.elevationRequired')),
            ValidationRules.noDecimals(t('errors.elevationInvalid')),
            ValidationRules.noLeadingZeros(t('errors.elevationInvalid')),
            ValidationRules.integerRange(1, 100000, t('errors.elevationInvalid')),
        ],
        priceEur: [
            ValidationRules.required(t('errors.priceRequired')),
            ValidationRules.noDecimals(t('errors.priceInvalid')),
            ValidationRules.integerRange(0, 1000, t('errors.priceInvalid')),
        ],
        websiteUrl: [
            ValidationRules.validUrl(t('errors.websiteUrlInvalid')),
        ],
        description: [
            ValidationRules.optionalMinLength(10, t('errors.descriptionTooShort')),
            ValidationRules.maxLength(1000, t('errors.descriptionTooLong')),
        ],
    });

    const validateField = (field: string, value: string) => {
        const rules = getValidationRules()[field as keyof ReturnType<typeof getValidationRules>];
        if (!rules) return true;

        for (const rule of rules) {
            if (!rule.validate(value)) {
                setErrors(prev => ({ ...prev, [field]: rule.errorMessage }));
                return false;
            }
        }
        setErrors(prev => ({ ...prev, [field]: '' }));
        return true;
    };

    const clearFieldError = (field: string) => {
        setErrors(prev => ({ ...prev, [field]: '' }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Normalize URL before validation
        const normalizedWebsiteUrl = normalizeUrl(websiteUrl);
        if (normalizedWebsiteUrl !== websiteUrl) {
            setWebsiteUrl(normalizedWebsiteUrl);
        }

        // Validate all fields
        const validationResults = [
            validateField('name', name),
            validateField('date', date),
            validateField('distanceKm', distanceKm),
            validateField('elevationGainM', elevationGainM),
            validateField('priceEur', priceEur),
            validateField('websiteUrl', normalizedWebsiteUrl),
            validateField('description', description),
        ];

        if (!validationResults.every(Boolean)) {
            return;
        }

        setIsLoading(true);

        try {
            await updateRace(raceId, date, name, distanceKm, elevationGainM, normalizedWebsiteUrl, description)
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
                setDescription('');
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
                            clearFieldError('name');
                        }}
                        error={errors.name}
                    />
                    <FormInput
                        id='date'
                        label={t('date')}
                        type='date'
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value);
                            clearFieldError('date');
                        }}
                        error={errors.date}
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
                            clearFieldError('distanceKm');
                        }}
                        error={errors.distanceKm}
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
                            clearFieldError('elevationGainM');
                        }}
                        error={errors.elevationGainM}
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
                            clearFieldError('priceEur');
                        }}
                        error={errors.priceEur}
                    />
                    <FormInput
                        id='websiteUrl'
                        label={t('websiteUrl')}
                        type='url'
                        value={websiteUrl}
                        placeholder={t('websiteUrlPlaceholder')}
                        onChange={(e) => {
                            setWebsiteUrl(e.target.value);
                            clearFieldError('websiteUrl');
                        }}
                        error={errors.websiteUrl}
                    />
                </div>
                <FormTextarea
                    id='description'
                    label={t('description')}
                    value={description}
                    placeholder={t('descriptionPlaceholder')}
                    maxLength={2000}
                    showCharacterCount={true}
                    rows={5}
                    onChange={(e) => {
                        setDescription(e.target.value);
                        clearFieldError('description');
                    }}
                    error={errors.description}
                />
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
