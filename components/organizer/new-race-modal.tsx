'use client';

import { BaseModal } from '@/components/ui/base-modal';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

export function InfoModal({
    isOpen,
    onClose,
    title,
    message,
}: InfoModalProps) {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
        >
            <p className="text-sm sm:text-base text-gray-700">{message}</p>
        </BaseModal>
    );
}
