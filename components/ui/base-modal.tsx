'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export type BaseModalMaxWidth =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '5xl'
  | '7xl';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  closeLabel?: string;
  maxWidth?: BaseModalMaxWidth;
  mobileFullscreen?: boolean;
}

export function BaseModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  closeLabel,
  maxWidth = '2xl',
  mobileFullscreen = false,
}: BaseModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl',
    '3xl': 'max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl',
    '5xl': 'max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-5xl',
    '7xl': 'max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-7xl',
  };
  const mobileFullscreenMaxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-lg md:max-w-xl lg:max-w-2xl',
    '3xl': 'sm:max-w-xl md:max-w-2xl lg:max-w-3xl',
    '5xl': 'sm:max-w-xl md:max-w-2xl lg:max-w-5xl',
    '7xl': 'sm:max-w-xl md:max-w-2xl lg:max-w-7xl',
  };

  const modalClassName = mobileFullscreen
    ? `relative z-50 flex h-dvh w-full flex-col bg-white shadow-lg sm:mx-4 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg ${mobileFullscreenMaxWidthClasses[maxWidth]}`
    : `relative z-50 mx-4 w-full rounded-lg bg-white shadow-lg ${maxWidthClasses[maxWidth]}`;
  const headerClassName = mobileFullscreen
    ? 'flex shrink-0 flex-col space-y-1.5 p-4 sm:p-6'
    : 'flex flex-col space-y-1.5 p-6';
  const titleClassName = mobileFullscreen
    ? 'line-clamp-2 min-w-0 flex-1 text-lg font-semibold leading-snug tracking-tight sm:line-clamp-none sm:text-2xl sm:leading-none'
    : 'text-2xl font-semibold leading-none tracking-tight';
  const contentClassName = mobileFullscreen
    ? 'flex min-h-0 flex-1 p-0 sm:block sm:flex-none sm:p-6 sm:pt-0'
    : 'p-6 pt-0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={modalClassName}>
        <div className={headerClassName}>
          <div className="flex items-center justify-between gap-2">
            <h3 className={titleClassName}>
              {title}
            </h3>
            <button
              aria-label={closeLabel}
              type="button"
              onClick={onClose}
              className={mobileFullscreen
                ? 'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-colors hover:text-gray-600 sm:size-auto'
                : 'cursor-pointer text-gray-400 transition-colors hover:text-gray-600'
              }
            >
              <X className={mobileFullscreen ? 'size-6 sm:size-5' : 'size-5'} />
            </button>
          </div>
          {description && (
            <p className="text-sm sm:text-base text-gray-500">
              {description}
            </p>
          )}
        </div>
        <div className={contentClassName}>
          {children}
        </div>
      </div>
    </div>
  );
}
