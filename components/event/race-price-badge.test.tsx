// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Locale } from '@/i18n';
import ca from '@/locales/ca/translation.json';
import es from '@/locales/es/translation.json';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import type { EventRaceTier } from '@/types/event.types';
import { RacePriceBadge } from './race-price-badge';

vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

const messages = { ca, es };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function tier(priceEur: number, endsAt: string | null): EventRaceTier {
  return { endsAt, priceEur };
}

function priceBadge(tiers: EventRaceTier[], locale: Locale = 'es') {
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <RacePriceBadge locale={locale} raceId="race-1" tiers={tiers} />
    </NextIntlClientProvider>
  );
}

describe('RacePriceBadge', () => {
  it('renders nothing without tiers', () => {
    const { container } = render(priceBadge([]));
    expect(container.innerHTML).toBe('');
  });

  it('renders free and paid single tiers during SSR', () => {
    expect(renderToString(priceBadge([tier(0, null)]))).toContain('Gratis');
    expect(renderToString(priceBadge([tier(35, null)]))).toContain('35€');
  });

  it('renders a single tier deadline in the compact format', () => {
    render(priceBadge([tier(35, '2027-01-31')]));
    expect(screen.getByText(/35€/).textContent).toContain('hasta 31/01');
  });

  it('renders a neutral SSR placeholder for a scheduled price', () => {
    const html = renderToString(
      priceBadge([
        tier(25, '2027-01-31'),
        tier(35, '2027-02-28'),
        tier(45, '2027-03-31'),
      ]),
    );
    const container = document.createElement('div');
    container.innerHTML = html;

    expect(
      container.querySelector('[data-testid="race-price-placeholder"]'),
    ).not.toBeNull();
  });

  it('renders the current Spanish tier and opens the complete schedule', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-15T12:00:00Z'));
    render(
      priceBadge([
        tier(35, '2027-01-31'),
        tier(45, '2027-02-28'),
      ]),
    );

    const trigger = screen.getByTestId('race-price-desktop-trigger');
    expect(trigger.textContent).toContain('35€ hasta 31/01');
    expect(screen.queryByText(/45€/)).toBeNull();

    fireEvent.click(trigger);

    const popover = screen.getByTestId('race-price-desktop-popover');
    expect(popover.textContent).toContain('35€hasta 31/01');
    expect(popover.textContent).toContain('45€hasta 28/02');
  });

  it('renders Catalan free pricing and opens the schedule in a mobile modal', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-15T12:00:00Z'));
    render(
      priceBadge(
        [tier(0, '2027-01-31'), tier(35, '2027-02-28')],
        'ca',
      ),
    );

    const trigger = screen.getByTestId('race-price-mobile-trigger');
    expect(trigger.textContent).toContain('Gratuïta fins al 31/01');
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Preus');
    expect(dialog.textContent).toContain('Gratuïtafins al 31/01');
    expect(dialog.textContent).toContain('35€fins al 28/02');
  });

  it('tracks only the first schedule opening for a race', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-15T12:00:00Z'));
    render(
      priceBadge([
        tier(35, '2027-01-31'),
        tier(45, '2027-02-28'),
      ]),
    );

    const trigger = screen.getByTestId('race-price-desktop-trigger');
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.RACE_TIERS_OPENED,
      {
        race_id: 'race-1',
        surface: 'desktop_popover',
        tier_count: 2,
      },
    );
  });
});
