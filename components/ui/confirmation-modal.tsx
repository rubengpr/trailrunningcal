'use client';

import { BaseModal, type BaseModalMaxWidth } from '@/components/ui/base-modal';
import { Button } from '@/components/ui/button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmButtonText: string;
    cancelButtonText: string;
    isSubmitting?: boolean;
    loadingText?: string;
    variant?: 'default' | 'destructive';
    /** Value the confirmation applies to, shown in a highlighted box under the message. */
    highlight?: string;
    highlightVariant?: 'text' | 'code';
    maxWidth?: BaseModalMaxWidth;
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
    loadingText,
    variant = 'default',
    highlight,
    highlightVariant = 'text',
    maxWidth,
}: ConfirmationModalProps) {
    const highlightClasses = {
        text: 'text-sm font-medium text-gray-800',
        code: 'text-xs font-mono text-gray-700 break-all',
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidth={maxWidth}
        >
            <div className="flex flex-col gap-4">
                <p className="text-sm sm:text-base text-gray-700">{message}</p>
                {highlight && (
                    <p className={`rounded-lg bg-gray-50 px-3 py-2 ${highlightClasses[highlightVariant]}`}>
                        {highlight}
                    </p>
                )}
                <div className="flex flex-row justify-end gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        {cancelButtonText}
                    </Button>
                    <Button
                        type="button"
                        variant={variant === 'destructive' ? 'secondary' : 'primary'}
                        onClick={onConfirm}
                        isLoading={isSubmitting}
                        loadingText={loadingText}
                        className={variant === 'destructive' ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
                    >
                        {confirmButtonText}
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
}
