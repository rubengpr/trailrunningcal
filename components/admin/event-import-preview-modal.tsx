'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface EventImportPreviewModalProps {
  isOpen: boolean;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

export function EventImportPreviewModal({
  isOpen,
  closeLabel,
  onClose,
  children,
}: EventImportPreviewModalProps): React.ReactElement | null {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/60 px-4 py-10 backdrop-blur-[1px] sm:py-14">
      <button
        type="button"
        data-testid="event-import-preview-backdrop"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl">
        <button
          type="button"
          onClick={onClose}
          title={closeLabel}
          className="absolute -top-3 -right-3 z-20 inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:text-gray-900"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>
        {children}
      </div>
    </div>
  );
}
