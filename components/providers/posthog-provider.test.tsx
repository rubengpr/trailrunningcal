// @vitest-environment jsdom

import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import posthog from 'posthog-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostHogProvider } from '@/components/providers/posthog-provider';

vi.mock('posthog-js', () => ({
  default: { __loaded: false, init: vi.fn() },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-token');
  posthog.__loaded = false;
  vi.mocked(posthog.init).mockImplementation(() => {
    posthog.__loaded = true;
    return posthog;
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('PostHogProvider', () => {
  it('cancels the first idle task during StrictMode effect replay', () => {
    const callbacks = new Map<number, IdleRequestCallback>();
    let nextId = 0;
    const cancel = vi.fn((id: number) => callbacks.delete(id));
    vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => {
      callbacks.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal('cancelIdleCallback', cancel);

    render(<StrictMode><PostHogProvider /></StrictMode>);

    expect(cancel).toHaveBeenCalledWith(1);
    expect(callbacks.size).toBe(1);
    callbacks.forEach((callback) => callback({ didTimeout: false, timeRemaining: () => 50 }));
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });

  it('initializes only once when several providers queue a timeout', () => {
    render(<><PostHogProvider /><PostHogProvider /></>);

    vi.advanceTimersByTime(1000);

    expect(posthog.init).toHaveBeenCalledTimes(1);
  });

  it('cancels the fallback timeout on unmount', () => {
    const { unmount } = render(<PostHogProvider />);

    unmount();
    vi.advanceTimersByTime(1000);

    expect(posthog.init).not.toHaveBeenCalled();
  });
});
