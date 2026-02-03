'use client';

import { useTranslations } from 'next-intl';

interface ClaimOrganizerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ClaimOrganizerModal({
    isOpen,
    onClose,
}: ClaimOrganizerModalProps) {
    const t = useTranslations('race.claimModal');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-lg max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl w-full mx-4 z-50">
                <div className="flex flex-col space-y-1.5 p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-semibold leading-none tracking-tight">
                            {t('title')}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="size-5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="p-6 pt-0">
                    <p className="text-sm sm:text-base text-gray-700">{t('message')}</p>
                </div>
            </div>
        </div>
    );
}
