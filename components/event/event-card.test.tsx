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
      layout_toggle_variant: 'icon_text',
    });
  });
});
