'use client';

import { useState, useRef } from 'react';
import {
    MAX_RACE_IMAGE_SIZE_BYTES,
    ALLOWED_RACE_IMAGE_MIME_TYPES,
} from '@/lib/race-image-constants';

export interface FormImageInputMessages {
    selectFile: string;
    changeFile: string;
    replaceFile: string;
    checking: string;
    uploaded: string;
    noImage: string;
    removeImage: string;
    fileTypeError: string;
    fileSizeError: string;
}

export interface FormImageInputProps {
    id: string;
    label: string;
    value: File | null;
    onChange: (file: File | null) => void;
    error?: string;
    disabled?: boolean;
    existingImage?: { hasImage: boolean; filename?: string } | null;
    isCheckingExisting?: boolean;
    onRemoveExisting?: () => void | Promise<void>;
    maxSizeBytes?: number;
    allowedMimeTypes?: readonly string[];
    messages: FormImageInputMessages;
}

export function FormImageInput({
    id,
    label,
    value,
    onChange,
    error: externalError,
    disabled = false,
    existingImage = null,
    isCheckingExisting = false,
    onRemoveExisting,
    maxSizeBytes = MAX_RACE_IMAGE_SIZE_BYTES,
    allowedMimeTypes = [...ALLOWED_RACE_IMAGE_MIME_TYPES],
    messages,
}: FormImageInputProps) {
    const [validationError, setValidationError] = useState('');
    const [isRemovingExisting, setIsRemovingExisting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleRemoveSelected = () => {
        onChange(null);
        setValidationError('');
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleRemoveExisting = async () => {
        if (!onRemoveExisting) return;
        setIsRemovingExisting(true);
        try {
            await onRemoveExisting();
        } finally {
            setIsRemovingExisting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setValidationError('');

        const types = [...allowedMimeTypes];
        if (!types.includes(file.type as (typeof types)[number])) {
            setValidationError(messages.fileTypeError);
            onChange(null);
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        if (file.size > maxSizeBytes) {
            setValidationError(messages.fileSizeError);
            onChange(null);
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        onChange(file);
    };

    const displayError = validationError || externalError || undefined;
    const acceptValue = allowedMimeTypes.join(',');

    return (
        <div className='flex flex-col gap-2'>
            <label className='text-sm font-medium'>
                {label}
            </label>

            {isCheckingExisting ? (
                <div className='flex items-center gap-2 text-sm text-gray-500'>
                    <svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
                        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    {messages.checking}
                </div>
            ) : existingImage?.hasImage && !value ? (
                <div className='flex items-center justify-between gap-2 p-3 bg-green-50 border border-green-200 rounded'>
                    <div className='flex items-center gap-2 min-w-0 flex-1'>
                        <svg className='w-5 h-5 text-green-600 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                        </svg>
                        <div className='min-w-0'>
                            <p className='text-sm font-medium text-green-900'>
                                {messages.uploaded}
                            </p>
                            {existingImage.filename && (
                                <p className='text-xs text-green-700 truncate'>
                                    {existingImage.filename}
                                </p>
                            )}
                        </div>
                    </div>
                    {onRemoveExisting && (
                        <button
                            type='button'
                            onClick={handleRemoveExisting}
                            disabled={disabled || isRemovingExisting}
                            title={messages.removeImage}
                            className='shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none cursor-pointer'
                        >
                            {isRemovingExisting ? (
                                <svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
                                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                                </svg>
                            ) : (
                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            ) : !existingImage?.hasImage && !value ? (
                <div className='flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded'>
                    <svg className='w-5 h-5 text-gray-400 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' />
                    </svg>
                    <p className='text-sm text-gray-600'>
                        {messages.noImage}
                    </p>
                </div>
            ) : null}

            <input
                ref={inputRef}
                id={id}
                type='file'
                accept={acceptValue}
                disabled={disabled}
                onChange={handleFileChange}
                className='hidden'
            />
            <label
                htmlFor={id}
                className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50 w-fit ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {value ? messages.changeFile : existingImage?.hasImage ? messages.replaceFile : messages.selectFile}
            </label>
            {value && (
                <div className='flex items-center gap-2'>
                    <svg className='w-4 h-4 text-green-600 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                    </svg>
                    <p className='text-xs text-gray-600 truncate min-w-0'>
                        {value.name}
                    </p>
                    <button
                        type='button'
                        onClick={handleRemoveSelected}
                        disabled={disabled}
                        title={messages.removeImage}
                        className='shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none cursor-pointer'
                    >
                        <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                    </button>
                </div>
            )}
            {displayError && (
                <p className='text-sm text-red-500'>{displayError}</p>
            )}
        </div>
    );
}
