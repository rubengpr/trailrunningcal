'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

export function PostHogProvider() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_KEY;

    if (!token || posthog.__loaded) return;

    const init = () => {
      posthog.init(token, {
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
