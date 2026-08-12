// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrailEventDetail } from '@/types/event.types';
import { PROVINCES } from '@/lib/geography/provinces';

const mocks = vi.hoisted(() => ({
  updateEvent: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/api/events', () => ({
  acceptScrapedEvent: vi.fn(),
  deleteEvent: vi.fn(),
  updateEvent: mocks.updateEvent,
  updateOrganizerEvent: vi.fn(),
}));

import { EventForm } from './event-form';

const initialData: TrailEventDetail = {
  event: {
    id: 'event-1',
    name: 'Trail Event',
    slug: 'trail-event',
    websiteUrl: 'https://example.com',
    organizerId: null,
    description: null,
    heroImageFilename: null,
    updatedAt: null,
  },
  races: [{
    id: 'race-1',
    name: '21K',
    date: '2027-05-01',
    city: 'Girona',
    province: 'Girona',
    distanceKm: 21,
    elevationGainM: 900,
    tiers: [],
  }],
  allRaceCount: 1,
  dateRange: { startDate: '2027-05-01', endDate: '2027-05-01' },
  location: {
    city: 'Girona',
    province: 'Girona',
    groups: [{ province: 'Girona', cities: ['Girona'] }],
    isMultipleLocations: false,
  },
};

afterEach(cleanup);

describe('EventForm province selection', () => {
  it('renders the canonical catalogue and preserves the stored value', () => {
    render(<EventForm eventId="event-1" initialData={initialData} isEditMode />);

    const select = screen.getByLabelText('province');
    expect(select.tagName).toBe('BUTTON');
    expect(select.textContent).toContain('Girona');

    fireEvent.click(select);
    expect(screen.getAllByRole('option').map((option) => (
      option.getAttribute('data-value')
    ))).toEqual(['', ...PROVINCES]);
  });

  it('shows the custom validation error when province is empty', () => {
    render(<EventForm eventId="event-1" initialData={initialData} isEditMode />);

    fireEvent.click(screen.getByLabelText('province'));
    fireEvent.click(screen.getByRole('option', { name: 'provincePlaceholder' }));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(screen.getByText('errors.province')).toBeTruthy();
    expect(mocks.updateEvent).not.toHaveBeenCalled();
  });
});

describe('EventForm race-track visibility', () => {
  it('shows track uploads only in admin edit mode', () => {
    const { unmount } = render(
      <EventForm eventId="event-1" initialData={initialData} isEditMode />,
    );
    expect(screen.getByLabelText('inputLabel')).toBeTruthy();
    unmount();

    const organizer = render(
      <EventForm
        eventId="event-1"
        initialData={initialData}
        isEditMode
        apiMode="organizer"
      />,
    );
    expect(screen.queryByLabelText('inputLabel')).toBeNull();
    organizer.unmount();

    render(<EventForm initialData={initialData} />);
    expect(screen.queryByLabelText('inputLabel')).toBeNull();
  });

  it('uses tracked race IDs to show the replace state', () => {
    render(
      <EventForm
        eventId="event-1"
        initialData={initialData}
        isEditMode
        trackedRaceIds={['race-1']}
      />,
    );

    expect(screen.getByRole('button', { name: 'replace' })).toBeTruthy();
  });

  it('explains that newly added races must be saved before upload', () => {
    render(
      <EventForm eventId="event-1" initialData={initialData} isEditMode />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'addRace' }));

    expect(screen.getByText('saveFirst')).toBeTruthy();
  });
});
