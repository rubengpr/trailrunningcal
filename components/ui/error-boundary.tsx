'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { TriangleAlert, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    track(ANALYTICS_EVENTS.ERROR_BOUNDARY_CAUGHT_ERROR, {
      error_message: error.message,
      error_stack: error.stack,
      component_stack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || <DefaultErrorFallback error={this.state.error} />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error?: Error;
}

function DefaultErrorFallback({ error }: DefaultErrorFallbackProps) {
  const t = useTranslations('errors');

  return (
    <div className="min-h-[200px] flex items-center justify-center p-6">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-4">
          <TriangleAlert className="mx-auto h-12 w-12 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('general')}
        </h3>
        <p className="text-gray-600 mb-4">{t('generalMessage')}</p>
        <button
          onClick={() => {
            track(ANALYTICS_EVENTS.ERROR_FALLBACK_RETRY_CLICKED, {
              error_message: error?.message,
            });
            window.location.reload();
          }}
          className="inline-flex items-center px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('retry')}
        </button>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              {t('errorDetails')}
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
