// @vitest-environment jsdom

import { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { useFeatureFlagVariantKey } from 'posthog-js/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useFeatureFlagVariant } from './use-feature-flag-variant';

vi.mock('posthog-js/react', () => ({ useFeatureFlagVariantKey: vi.fn() }));

let root: Root | undefined;
const reactGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

beforeAll(() => {
  reactGlobal.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  reactGlobal.IS_REACT_ACT_ENVIRONMENT = false;
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

function FlagValue() {
  const variant = useFeatureFlagVariant('test-flag');
  return <span>{variant ?? 'control'}</span>;
}

describe('useFeatureFlagVariant', () => {
  it('keeps the server and first client render in sync', async () => {
    vi.mocked(useFeatureFlagVariantKey).mockReturnValue('variant');
    const container = document.createElement('div');
    container.innerHTML = renderToString(<FlagValue />);
    document.body.append(container);
    const recoverableErrors: unknown[] = [];

    await act(async () => {
      root = hydrateRoot(container, <FlagValue />, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    expect(recoverableErrors).toEqual([]);
    expect(container.textContent).toBe('variant');
  });
});
