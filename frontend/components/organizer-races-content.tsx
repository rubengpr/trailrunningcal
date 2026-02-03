'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { InfoModal } from './new-race-modal';

export function OrganizerRacesContent() {
    const t = useTranslations('organizer.races');
    const tModal = useTranslations('organizer.races.infoModal');
    const locale = useLocale();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <>
            <div className='flex flex-col items-center justify-center gap-6 min-h-[60vh]'>
                <p className='text-base text-gray-700 text-center'>
                    {t('noRacesMessage')}{' '}
                    <Link
                        href={`/${locale}`}
                        className='text-indigo-600 hover:text-indigo-800 underline font-medium'
                    >
                        {t('noRacesMessageLink')}
                    </Link>
                </p>
                <button
                    onClick={handleOpenModal}
                    className='px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer w-fit'
                >
                    {t('newRaceButton')}
                </button>
            </div>
            <InfoModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={tModal('title')}
                message={tModal('message')}
                closeButtonLabel={tModal('close')}
            />
        </>
    );
}
