'use client';

import { BaseModal } from './base-modal';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    closeButtonLabel?: string;
}

export function InfoModal({
    isOpen,
    onClose,
    title,
    message,
    closeButtonLabel = 'Cerrar',
}: InfoModalProps) {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            closeButtonLabel={closeButtonLabel}
        >
            <p className="text-sm sm:text-base text-gray-700">{message}</p>
        </BaseModal>
    );
}
