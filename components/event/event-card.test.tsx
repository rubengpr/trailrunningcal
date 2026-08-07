// @vitest-environment jsdom

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicEventDetail } from '@/types/event.types';

const mocks = vi.hoisted(() => ({
  pending: false,
  linkClick: vi.fn(),
}));

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
    <a
      href={href}
      data-prefetch={String(prefetch)}
      onClick={mocks.linkClick}
      {...props}
    >
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: mocks.pending }),
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending = false;
});

afterEach(cleanup);

describe('EventCard', () => {
  it('keeps prefetch disabled and links to the localized event page', () => {
    render(<EventCard eventDetail={eventDetail} locale="es" />);

    const link = screen.getByRole('link', { name: /Trail de prova/ });
    expect(link.getAttribute('href')).toBe('/es/e/trail-de-prova');
    expect(link.getAttribute('data-prefetch')).toBe('false');
    expect(screen.queryByTestId('event-card-pending')).toBeNull();
  });

  it('shows the pending overlay and prevents repeated link clicks', () => {
    mocks.pending = true;
    render(<EventCard eventDetail={eventDetail} locale="ca" />);

    const link = screen.getByRole('link', { name: /Trail de prova/ });
    const overlay = screen.getByTestId('event-card-pending');

    expect(fireEvent.click(overlay)).toBe(false);
    expect(mocks.linkClick).not.toHaveBeenCalled();
    expect(link.getAttribute('href')).toBe('/ca/e/trail-de-prova');
  });
});
