'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { FormInput } from '@/components/ui/form-input';
import { FormTextarea } from '@/components/ui/form-textarea';
import { FormImageInput } from '@/components/ui/form-image-input';
import type { TrailRace } from '@/types/race.types';
import { updateRace, createRace, deleteRace } from '@/lib/api/races';
import { updatePrice } from '@/lib/api/race_tiers';
import { ConfirmationModal } from '@/components/modals/confirmation-modal';
import { useModal } from '@/hooks/use-modal';
import { uploadRaceImage, checkRaceImage, removeRaceImage, type RaceImageStatus } from '@/lib/api/race-image';
import {
    ValidationRule,
    ValidationRules,
    FieldErrors,
    createFormValidator,
    normalizeUrl,
} from '@/lib/validation';

interface RaceFormFields {
    name: string;
    date: string;
    distanceKm: string;
    elevationGainM: string;
    priceEur: string;
    websiteUrl: string;
    city: string;
    province: string;
    description: string;
}

interface RaceFormProps {
    raceId: string;
    initialData: TrailRace | null;
    isEditMode: boolean;
}

export function RaceForm({ raceId, initialData, isEditMode }: RaceFormProps) {
    const t = useTranslations('organizer.races.form');
    const router = useRouter();
    const params = useParams();
    const locale = typeof params?.locale === 'string' ? params.locale : 'es';
    const [date, setDate] = useState(initialData?.date ?? '');
    const [name, setName] = useState(initialData?.name ?? '');
    const [distanceKm, setDistanceKm] = useState<string>(initialData != null ? String(initialData.distanceKm) : '');
    const [elevationGainM, setElevationGainM] = useState<string>(initialData?.elevationGainM != null ? String(initialData.elevationGainM) : '');
    const [priceEur, setPriceEur] = useState<string>(initialData?.priceEur != null ? String(initialData.priceEur) : '');
    const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl ?? '');
    const [city, setCity] = useState(initialData?.city ?? '');
    const [province, setProvince] = useState(initialData?.province ?? '');
    const [description, setDescription] = useState(initialData?.description ?? '');

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { isOpen: isDeleteModalOpen, open: openDeleteModal, close: closeDeleteModal } = useModal();

    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imageError, setImageError] = useState('');
    const [existingImageStatus, setExistingImageStatus] = useState<RaceImageStatus | null>(null);
    const [isCheckingImage, setIsCheckingImage] = useState(false);

    useEffect(() => {
        if (isEditMode && initialData?.organizerId) {
            setIsCheckingImage(true);
            checkRaceImage(raceId)
                .then(status => setExistingImageStatus(status))
                .catch(err => console.error('Failed to check image:', err))
                .finally(() => setIsCheckingImage(false));
        }
    }, [raceId, isEditMode, initialData?.organizerId]);

    const validator = createFormValidator<RaceFormFields>(setFieldErrors, fieldErrors);

    const validationRules: Partial<Record<keyof RaceFormFields, ValidationRule[]>> = {
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
            {
                validate: (value: string) => {
                    const num = parseFloat(value.trim().replace(',', '.'));
                    return !isNaN(num) && num > 0 && num < 1000;
                },
                errorMessage: t('errors.distanceInvalid'),
            },
            {
                validate: (value: string) => parseFloat(value.replace(',', '.')) < 1000,
                errorMessage: t('errors.distanceTooLong'),
            },
        ],
        elevationGainM: [
            ValidationRules.required(t('errors.elevationRequired')),
            ValidationRules.noDecimals(t('errors.elevationInvalid')),
            ValidationRules.noLeadingZeros(t('errors.elevationInvalid')),
            {
                validate: (value: string) => {
                    const num = parseInt(value.trim(), 10);
                    return !isNaN(num) && num > 0 && num < 100000;
                },
                errorMessage: t('errors.elevationInvalid'),
            },
        ],
        priceEur: [
            ValidationRules.required(t('errors.priceRequired')),
            ValidationRules.noDecimals(t('errors.priceInvalid')),
            ValidationRules.integerRange(0, 1000, t('errors.priceInvalid')),
        ],
        websiteUrl: [
            ValidationRules.required(t('errors.websiteUrlRequired')),
            ValidationRules.validUrl(t('errors.websiteUrlInvalid')),
        ],
        city: [
            ValidationRules.required(t('errors.cityRequired')),
            ValidationRules.maxLength(100, t('errors.cityTooLong')),
        ],
        province: [
            ValidationRules.required(t('errors.provinceRequired')),
            ValidationRules.maxLength(100, t('errors.provinceTooLong')),
        ],
        description: [
            ValidationRules.optionalMinLength(10, t('errors.descriptionTooShort')),
            ValidationRules.maxLength(2000, t('errors.descriptionTooLong')),
        ],
    };

    const validateAndNormalizeUrl = (url: string): boolean => {
        const trimmed = url.trim();
        if (!trimmed) {
            validator.validate('websiteUrl', url, validationRules.websiteUrl!);
            return false;
        }

        const normalized = normalizeUrl(trimmed);
        if (normalized !== trimmed) {
            setWebsiteUrl(normalized);
        }

        return validator.validate('websiteUrl', normalized, validationRules.websiteUrl!);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteRace(raceId);
            toast.success(t('deleteSuccess'));
            router.push(`/${locale}/org/carreras`);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : t('errors.deleteFailed');
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
            closeDeleteModal();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const values: RaceFormFields = { name, date, distanceKm, elevationGainM, priceEur, websiteUrl, city, province, description };
        const isUrlValid = validateAndNormalizeUrl(websiteUrl);
        const isValid = validator.validateAll(validationRules, values) && isUrlValid;

        if (!isValid) {
            return;
        }

        setIsLoading(true);

        try {
            if (!isEditMode) {
                await createRace({ date, name, distanceKm, elevationGainM, priceEur, websiteUrl, city, province, description });
                toast.success(t('success'));
                router.push(`/${locale}/org/carreras`);
                return;
            }

            await updateRace(raceId, date, name, distanceKm, elevationGainM, websiteUrl, city, province, description);
            await updatePrice({ raceId, priceEur: parseInt(priceEur, 10) });

            if (selectedImageFile) {
                try {
                    await uploadRaceImage(raceId, selectedImageFile);
                    setSelectedImageFile(null);
                    const status = await checkRaceImage(raceId);
                    setExistingImageStatus(status);
                } catch (err) {
                    const imageErrorMsg = err instanceof Error ? err.message : t('image.errors.general');
                    toast.error(t('image.errors.uploadFailed'));
                    setImageError(imageErrorMsg);
                    setIsLoading(false);
                    return;
                }
            }

            toast.success(t('success'));
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : t('errors.general');
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const showImageBlock = isEditMode && initialData?.organizerId;

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
                            validator.clearError('name');
                            setError('');
                        }}
                        error={fieldErrors.name}
                    />
                    <FormInput
                        id='date'
                        label={t('date')}
                        type='date'
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value);
                            validator.clearError('date');
                            setError('');
                        }}
                        error={fieldErrors.date}
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
                            validator.clearError('distanceKm');
                            setError('');
                        }}
                        error={fieldErrors.distanceKm}
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
                            validator.clearError('elevationGainM');
                            setError('');
                        }}
                        error={fieldErrors.elevationGainM}
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
                            validator.clearError('priceEur');
                            setError('');
                        }}
                        error={fieldErrors.priceEur}
                    />
                    <FormInput
                        id='websiteUrl'
                        label={t('websiteUrl')}
                        type='url'
                        value={websiteUrl}
                        placeholder={t('websiteUrlPlaceholder')}
                        onChange={(e) => {
                            setWebsiteUrl(e.target.value);
                            validator.clearError('websiteUrl');
                            setError('');
                        }}
                        error={fieldErrors.websiteUrl}
                    />
                    <FormInput
                        id='city'
                        label={t('city')}
                        type='text'
                        value={city}
                        onChange={(e) => {
                            setCity(e.target.value);
                            validator.clearError('city');
                            setError('');
                        }}
                        error={fieldErrors.city}
                    />
                    <FormInput
                        id='province'
                        label={t('province')}
                        type='text'
                        value={province}
                        onChange={(e) => {
                            setProvince(e.target.value);
                            validator.clearError('province');
                            setError('');
                        }}
                        error={fieldErrors.province}
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
                        validator.clearError('description');
                        setError('');
                    }}
                    error={fieldErrors.description}
                />
                {showImageBlock && (
                    <FormImageInput
                        id='race-image'
                        label={t('image.label')}
                        value={selectedImageFile}
                        onChange={(file) => {
                            setSelectedImageFile(file);
                            setImageError('');
                        }}
                        error={imageError}
                        disabled={isLoading}
                        existingImage={existingImageStatus}
                        isCheckingExisting={isCheckingImage}
                        onRemoveExisting={async () => {
                            try {
                                await removeRaceImage(raceId);
                                const status = await checkRaceImage(raceId);
                                setExistingImageStatus(status);
                                toast.success(t('image.removed'));
                            } catch (err) {
                                const errorMsg = err instanceof Error ? err.message : t('image.errors.general');
                                toast.error(errorMsg);
                            }
                        }}
                        messages={{
                            selectFile: t('image.selectFile'),
                            changeFile: t('image.changeFile'),
                            replaceFile: t('image.replaceFile'),
                            checking: t('image.checking'),
                            uploaded: t('image.uploaded'),
                            noImage: t('image.noImage'),
                            removeImage: t('image.removeImage'),
                            fileTypeError: t('image.errors.fileType'),
                            fileSizeError: t('image.errors.fileSize'),
                        }}
                    />
                )}
            </div>
            <div className='flex justify-end items-center gap-3'>
                {isEditMode && (
                    <button
                        type='button'
                        onClick={openDeleteModal}
                        disabled={isLoading || isDeleting}
                        className='inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer'
                    >
                        {isDeleting ? t('deleting') : t('deleteButton')}
                    </button>
                )}
                <button
                    type='submit'
                    className='inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer'
                    disabled={isLoading || isDeleting}
                >
                    {isLoading ? t('saving') : t('save')}
                </button>
            </div>
            {error && (
                <p className='text-sm text-red-500'>{error}</p>
            )}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={handleDelete}
                title={t('deleteConfirm.title')}
                message={t('deleteConfirm.message')}
                confirmButtonText={t('deleteConfirm.confirm')}
                cancelButtonText={t('deleteConfirm.cancel')}
                isSubmitting={isDeleting}
            />
        </form>
    );
}
