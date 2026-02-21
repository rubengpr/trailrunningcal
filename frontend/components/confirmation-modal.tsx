'use client';

import { BaseModal } from './base-modal';
import { Button } from './button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmButtonText: string;
    cancelButtonText: string;
    isSubmitting?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmButtonText,
    cancelButtonText,
    isSubmitting = false,
}: ConfirmationModalProps) {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            closeButtonLabel={cancelButtonText}
        >
            <p className="text-sm sm:text-base text-gray-700 mb-6">{message}</p>
            <div className="flex flex-row justify-end gap-3">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={isSubmitting}
                >
                    {cancelButtonText}
                </Button>
                <Button
                    variant="primary"
                    onClick={onConfirm}
                    disabled={isSubmitting}
                >
                    {confirmButtonText}
                </Button>
            </div>
        </BaseModal>
    );
}
