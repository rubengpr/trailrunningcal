// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLinkStatus } from 'next/link';
import { EventNavigationLoading } from '@/components/event/event-navigation-loading';

vi.mock('next/link', () => ({ useLinkStatus: vi.fn() }));

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('EventNavigationLoading', () => {
  it('only displays the skeleton during a pending navigation', () => {
    vi.mocked(useLinkStatus).mockReturnValue({ pending: false });
    const { rerender } = render(<EventNavigationLoading />);
    expect(document.querySelector('[data-event-navigation-loading]')).toBeNull();

    vi.mocked(useLinkStatus).mockReturnValue({ pending: true });
    rerender(<EventNavigationLoading />);
    expect(document.querySelector('[data-event-navigation-loading]')).not.toBeNull();

    vi.mocked(useLinkStatus).mockReturnValue({ pending: false });
    rerender(<EventNavigationLoading />);
    expect(document.querySelector('[data-event-navigation-loading]')).toBeNull();
  });

  it('renders outside the card and leaves the public header visible', () => {
    document.body.innerHTML = '<header></header><main id="main-content"><article></article></main>';
    const header = document.querySelector('header')!;
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ bottom: 120 } as DOMRect);
    vi.mocked(useLinkStatus).mockReturnValue({ pending: true });

    render(<EventNavigationLoading />, { container: document.querySelector('article')! });

    const overlay = document.querySelector<HTMLElement>('[data-event-navigation-loading]')!;
    expect(overlay.parentElement).toBe(document.body);
    expect(overlay.style.top).toBe('120px');
    expect(overlay.querySelector('.motion-safe\\:animate-pulse')).not.toBeNull();
  });
});
