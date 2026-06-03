'use client';

import { useTranslations } from 'next-intl';
import { BaseModal } from '@/components/ui/base-modal';

interface ClaimOrganizerModalProps {
    isOpen: boolean;
    onClose: () => void;
    translationNamespace?: string;
}

export function ClaimOrganizerModal({
    isOpen,
    onClose,
    translationNamespace = 'race.claimModal',
}: ClaimOrganizerModalProps) {
    const t = useTranslations(translationNamespace);

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
