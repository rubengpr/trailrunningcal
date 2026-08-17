// @vitest-environment jsdom

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicEventDetail } from '@/types/event.types';

vi.mock('next/link', () => ({
  default: ({
    href,
    prefetch,
    children,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    children: ReactNode;
  }) => (
    <a
      href={href}
      data-prefetch={String(prefetch)}
      data-has-on-click={String(Boolean(onClick))}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

import { EventCard } from './event-card';
import { track } from '@/lib/analytics/track';

const eventDetail: PublicEventDetail = {
  event: {
    id: 'event-1',
    name: 'Trail de prova',
    slug: 'trail-de-prova',
  },
  races: [
    {
      id: 'race-1',
      name: null,
      date: '2026-09-12',
      distanceKm: 21.5,
      elevationGainM: 900,
      city: 'Girona',
      province: 'Girona',
    },
  ],
  dateRange: {
    startDate: '2026-09-12',
    endDate: '2026-09-12',
  },
  location: {
    city: 'Girona',
    province: 'Girona',
    groups: [{ province: 'Girona', cities: ['Girona'] }],
    isMultipleLocations: false,
  },
};

afterEach(cleanup);

describe('EventCard', () => {
  it('renders each race distance as an independently colored badge', () => {
    const eventWithMultipleDistances: PublicEventDetail = {
      ...eventDetail,
      races: [
        eventDetail.races[0]!,
        {
          ...eventDetail.races[0]!,
          id: 'race-2',
          distanceKm: 42,
        },
        {
          ...eventDetail.races[0]!,
          id: 'race-3',
          distanceKm: 50,
        },
      ],
    };

    const { container } = render(
      <EventCard eventDetail={eventWithMultipleDistances} locale="es" />,
    );

    const badges = container.querySelectorAll('[data-distance-group]');
    expect(Array.from(badges, (badge) => badge.getAttribute('data-distance-group')))
      .toEqual(['20-30', '40-50', '50+']);
    expect(screen.getAllByText('km')).toHaveLength(3);
  });

  it('keeps prefetch disabled and links to the localized event page', () => {
    render(<EventCard eventDetail={eventDetail} locale="es" />);

    const link = screen.getByRole('link', { name: /Trail de prova/ });
    expect(link.getAttribute('href')).toBe('/es/e/trail-de-prova');
    expect(link.getAttribute('data-prefetch')).toBe('false');
    expect(link.getAttribute('data-has-on-click')).toBe('false');
  });

  it('tracks explorer card clicks with the layout-toggle variant', () => {
    render(
      <EventCard
        eventDetail={eventDetail}
        locale="es"
        analyticsContext={{
          source: 'calendar_explorer',
          pageType: 'homepage',
          listPosition: 10,
          layoutToggleVariant: 'icon_text',
        }}
      />,
    );

    const link = screen.getByRole('link', { name: /Trail de prova/ });
    fireEvent.click(link);

    expect(link.getAttribute('data-has-on-click')).toBe('true');
    expect(track).toHaveBeenCalledWith('race_card_clicked', {
      event_id: 'event-1',
      event_slug: 'trail-de-prova',
      source: 'calendar_explorer',
      list_position: 10,
      layout_toggle_variant: 'icon_text',
    });
  });

  it('renders the featured badge and description only when featured', () => {
    const { container: plain } = render(<EventCard eventDetail={eventDetail} locale="es" />);
    expect(plain.textContent).not.toContain('event.featured.badge');
    expect(plain.textContent).not.toContain('featuredEvents.trail-de-prova');
    expect(
      (plain.querySelector('article') as HTMLElement | null)?.style.background,
    ).toBeFalsy();

    cleanup();

    const { container: featured } = render(
      <EventCard eventDetail={eventDetail} locale="es" isFeatured />,
    );
    expect(featured.textContent).toContain('event.featured.badge');
    expect(featured.textContent).toContain('featuredEvents.trail-de-prova');
    expect(
      (featured.querySelector('article') as HTMLElement | null)?.style.background,
    ).toContain('linear-gradient');
  });

  it('tracks explorer card clicks without a layout-toggle variant', () => {
    render(
      <EventCard
        eventDetail={eventDetail}
        locale="es"
        analyticsContext={{
          source: 'calendar_explorer',
          pageType: 'homepage',
          listPosition: 3,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('link', { name: /Trail de prova/ }));

    expect(track).toHaveBeenCalledWith('race_card_clicked', {
      event_id: 'event-1',
      event_slug: 'trail-de-prova',
      source: 'calendar_explorer',
      list_position: 3,
    });
  });
});
