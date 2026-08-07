// @vitest-environment jsdom

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicEventDetail } from '@/types/event.types';

vi.mock('next/link', () => ({
  default: ({
    href,
    prefetch,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    children: ReactNode;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

import { EventCard } from './event-card';

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
  });
});
