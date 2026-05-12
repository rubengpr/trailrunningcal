'use client';

import React from 'react';
import { TriangleAlert, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('errors');
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
          <TriangleAlert className={`mx-auto ${iconSize[variant]} text-red-500`} />
        </div>
        <h3
          className={`${titleSize[variant]} font-semibold text-gray-900 mb-2`}
        >
          {title || t('general')}
        </h3>
        <p className={`${messageSize[variant]} text-gray-600 mb-4`}>
          {message || t('generalMessage')}
        </p>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('retry')}
          </button>
        )}
      </div>
    </div>
  );
}

interface SearchErrorProps {
  onRetry?: () => void;
}

export function SearchError({ onRetry }: SearchErrorProps) {
  const t = useTranslations('errors');

  return (
    <div className="w-full py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <ErrorMessage
          title={t('searchError')}
          message={t('searchErrorMessage')}
          onRetry={onRetry}
          variant="default"
        />
      </div>
    </div>
  );
}
