'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

export function ErrorMessage({
  title,
  message,
  onRetry,
  showRetry = true,
  variant = 'default',
  className = '',
}: ErrorMessageProps) {
  const { t } = useTranslation();
  const baseClasses = 'text-center';
  const variantClasses = {
    default: 'min-h-[200px] flex items-center justify-center p-6',
    compact: 'p-4',
    inline: 'p-2',
  };

  const iconSize = {
    default: 'h-12 w-12',
    compact: 'h-8 w-8',
    inline: 'h-6 w-6',
  };

  const titleSize = {
    default: 'text-lg',
    compact: 'text-base',
    inline: 'text-sm',
  };

  const messageSize = {
    default: 'text-base',
    compact: 'text-sm',
    inline: 'text-xs',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <svg
            className={`mx-auto ${iconSize[variant]} text-red-500`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3
          className={`${titleSize[variant]} font-semibold text-gray-900 mb-2`}
        >
          {title || t('errors.general')}
        </h3>
        <p className={`${messageSize[variant]} text-gray-600 mb-4`}>
          {message || t('errors.generalMessage')}
        </p>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t('errors.retry')}
          </button>
        )}
      </div>
    </div>
  );
}

interface RaceCardErrorProps {
  onRetry?: () => void;
}

export function RaceCardError({ onRetry }: RaceCardErrorProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
      <ErrorMessage
        title={t('errors.raceLoadError')}
        message={t('errors.raceLoadErrorMessageFull')}
        onRetry={onRetry}
        variant="compact"
        className="min-h-[120px]"
      />
    </div>
  );
}

interface SearchErrorProps {
  onRetry?: () => void;
}

export function SearchError({ onRetry }: SearchErrorProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <ErrorMessage
          title={t('errors.searchError')}
          message={t('errors.searchErrorMessage')}
          onRetry={onRetry}
          variant="default"
        />
      </div>
    </div>
  );
}

