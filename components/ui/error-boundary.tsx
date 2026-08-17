'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { ErrorMessage } from '@/components/ui/error-message';

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
    <div>
      <ErrorMessage
        onRetry={() => {
          track(ANALYTICS_EVENTS.ERROR_FALLBACK_RETRY_CLICKED, {
            error_message: error?.message,
          });
          window.location.reload();
        }}
      />
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mx-auto max-w-md px-6 pb-6 text-left">
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
  );
}

export { ErrorBoundary };
