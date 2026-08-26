// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import es from '@/locales/es/translation.json';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { useFeatureFlagVariant } from '@/hooks/use-feature-flag-variant';
import { SponsorBannerSlot } from './sponsor-banner-slot';

vi.mock('@/hooks/use-feature-flag-variant', () => ({
  useFeatureFlagVariant: vi.fn(),
}));
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));
vi.mock('@/components/home/promo-banner', () => ({
  PromoBanner: ({
    alt,
    href,
    onClick,
  }: {
    alt: string;
    href?: string;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {alt}
    </a>
  ),
}));

let intersectionCallback: IntersectionObserverCallback;

beforeEach(() => {
  window.IntersectionObserver = class implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [0.5];

    constructor(callback: IntersectionObserverCallback) {
      intersectionCallback = callback;
    }

    disconnect(): void {}
    observe(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    unobserve(): void {}
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderBanner(page: 'homepage' | 'event_page') {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <SponsorBannerSlot page={page} locale="es" />
    </NextIntlClientProvider>,
  );
}

describe('SponsorBannerSlot', () => {
  it('tracks a visible creative impression and click', () => {
    vi.mocked(useFeatureFlagVariant).mockReturnValue('naak');
    renderBanner('homepage');

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    const banner = screen.getByRole('link', {
      name: 'Promoción de Näak Boost Energy para trail running',
    });
    fireEvent.click(banner);

    const properties = expect.objectContaining({
      brand: 'naak',
      creative_variant: 'naak',
      page: 'homepage',
      banner_type: 'image_banner',
      locale: 'es',
    });

    expect(track).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.SPONSOR_BANNER_IMPRESSION,
      properties,
    );
    expect(track).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.SPONSOR_BANNER_CLICKED,
      properties,
    );
  });

  it('uses the same PostHog variant on event pages', () => {
    vi.mocked(useFeatureFlagVariant).mockReturnValue('racepace');
    renderBanner('event_page');

    const banner = screen.getByRole('link', {
      name: 'RacePace, tu copiloto para trail ultra',
    });

    expect(banner.getAttribute('href')).toContain('event_page_image_banner');
  });
});
