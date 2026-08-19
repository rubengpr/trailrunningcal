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
  id: 'race-1',
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

describe('EventRacesEditModal track uploads', () => {
  it('shows uploads only when enabled for an admin event edit', () => {
    const { unmount } = render(
      <EventRacesEditModal
        isOpen
        event={event}
        races={races}
        title="Edit"
        showTrackUploads
        trackedRaceIds={['race-1']}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('inputLabel')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'replace' })).toBeTruthy();
    unmount();

    render(
      <EventRacesEditModal
        isOpen
        event={event}
        races={races}
        title="Review"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('inputLabel')).toBeNull();
  });
});

describe('EventRacesEditModal results URLs', () => {
  it('shows saved results and validates the protocol before saving', () => {
    const onSave = vi.fn();
    render(
      <EventRacesEditModal
        isOpen
        event={event}
        races={[{
          ...races[0],
          resultsUrl: 'https://results.example.com/21k',
        }]}
        title="Edit"
        showResultsUrls
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = screen.getByPlaceholderText('resultsUrlPlaceholder');
    expect((input as HTMLInputElement).value).toBe(
      'https://results.example.com/21k',
    );

    fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'saveReview' }));

    expect(screen.getByText('errors.resultsUrl')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('EventRacesEditModal elevation', () => {
  it('rejects a non-numeric elevation instead of silently saving zero', () => {
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

    const elevation = screen.getByLabelText('editFieldElevation');
    fireEvent.change(elevation, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'saveReview' }));

    expect(screen.getByText('errors.elevation')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a cleared elevation as null', () => {
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

    fireEvent.change(screen.getByLabelText('editFieldElevation'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'saveReview' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][1][0].elevationGainM).toBeNull();
  });

  it('round-trips an existing elevation unchanged', () => {
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

    expect((screen.getByLabelText('editFieldElevation') as HTMLInputElement).value)
      .toBe('900');

    fireEvent.click(screen.getByRole('button', { name: 'saveReview' }));

    expect(onSave.mock.calls[0][1][0].elevationGainM).toBe(900);
  });
});

describe('EventRacesEditModal field wiring', () => {
  it('gives each race its own labelled controls', () => {
    const secondRace: EventRaceWriteInput = {
      ...races[0],
      id: 'race-2',
      name: '42K',
      distanceKm: 42,
    };
    const { container } = render(
      <EventRacesEditModal
        isOpen
        event={event}
        races={[races[0], secondRace]}
        title="Edit"
        showResultsUrls
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const ids = [...container.querySelectorAll('input, textarea')]
      .map((element) => element.id)
      .filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);

    const unresolvedLabels = [...container.querySelectorAll('label[for]')]
      .map((label) => label.getAttribute('for'))
      .filter((target) => target && !document.getElementById(target));
    expect(unresolvedLabels).toEqual([]);

    const distances = screen.getAllByLabelText('editFieldDistance');
    expect(distances.map((input) => (input as HTMLInputElement).value))
      .toEqual(['21', '42']);
  });
});
