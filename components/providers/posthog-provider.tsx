'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

export default function PostHogProvider() {
  useEffect(() => {
    if (posthog.__loaded) return;

    const init = () => {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: '/ingest',
        ui_host: 'https://eu.posthog.com',
        defaults: '2025-05-24',
        capture_exceptions: true,
        debug: process.env.NODE_ENV === 'development',
      });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(init);
    } else {
      setTimeout(init, 1000);
    }
  }, []);

  return null;
}
