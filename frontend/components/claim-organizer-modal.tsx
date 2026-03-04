'use client';

import { useTranslations } from 'next-intl';
import { BaseModal } from './base-modal';

interface ClaimOrganizerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ClaimOrganizerModal({
    isOpen,
    onClose,
}: ClaimOrganizerModalProps) {
    const t = useTranslations('race.claimModal');

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('title')}
        >
            <p className="text-sm sm:text-base text-gray-700">{t('message')}</p>
        </BaseModal>
    );
}
