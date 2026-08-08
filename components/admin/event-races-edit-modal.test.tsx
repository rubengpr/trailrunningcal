// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EventRaceWriteInput } from '@/lib/api/events';
import type { TrailEventAgentEvent } from '@/types/trail-event-agent.types';
import { PROVINCES } from '@/lib/geography/provinces';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { EventRacesEditModal } from './event-races-edit-modal';

const event: TrailEventAgentEvent = {
  name: 'Trail Event',
  description: null,
  websiteUrl: 'https://example.com',
};
const races: EventRaceWriteInput[] = [{
  name: '21K',
  date: '2027-05-01',
  city: 'Girona',
  province: 'Girona',
  distanceKm: 21,
  elevationGainM: 900,
  tiers: [],
}];

afterEach(cleanup);

describe('EventRacesEditModal province selection', () => {
  it('renders the canonical catalogue and preserves the reviewed value', () => {
    render(
      <EventRacesEditModal
        isOpen
        event={event}
        races={races}
        title="Edit"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const select = screen.getByRole('combobox');
    expect(select.tagName).toBe('BUTTON');
    expect(select.textContent).toContain('Girona');

    fireEvent.click(select);
    expect(screen.getAllByRole('option').map((option) => (
      option.getAttribute('data-value')
    ))).toEqual(['', ...PROVINCES]);
  });

  it('blocks saving an empty province with the custom error', () => {
    const onSave = vi.fn();
    render(
      <EventRacesEditModal
        isOpen
        event={event}
        races={races}
        title="Edit"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'provincePlaceholder' }));
    fireEvent.click(screen.getByRole('button', { name: 'saveReview' }));

    expect(screen.getByText('errors.province')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
});
