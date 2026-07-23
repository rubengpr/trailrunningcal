// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface EditModalProps {
  isOpen: boolean;
  event: TrailEventAgentEvent;
  races: TrailEventAgentRace[];
  onSave: (
    event: TrailEventAgentEvent,
    races: TrailEventAgentRace[],
  ) => Promise<void> | void;
}

vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/admin/event-races-edit-modal', () => ({
  EventRacesEditModal: ({
    isOpen,
    event,
    races,
    onSave,
  }: EditModalProps) => isOpen ? (
    <div>
      <span>edit-form</span>
      <span>{event.description}</span>
      <button
        type="button"
        onClick={() => void onSave(
          { ...event, description: 'Unsaved edited value' },
          races,
        )}
      >
        submit-edit
      </button>
    </div>
  ) : null,
}));

import { EventImportPreview } from './event-import-preview';

const event: TrailEventAgentEvent = {
  name: 'Trail Event',
  description: 'Original value',
  websiteUrl: 'https://example.com',
};
const races: TrailEventAgentRace[] = [{
  name: '21K',
  date: '2027-05-01',
  city: 'Barcelona',
  province: 'Barcelona',
  distanceKm: 21,
  elevationGainM: 900,
  tiers: [],
}];

afterEach(cleanup);

describe('EventImportPreview review saving', () => {
  it('keeps the edit form mounted when persistence fails', async () => {
    const onSaveReview = vi.fn().mockRejectedValue(new Error('save failed'));
    render(
      <EventImportPreview
        event={event}
        races={races}
        isLoading={false}
        error={null}
        onAccept={vi.fn()}
        isAccepted={false}
        isAccepting={false}
        onReject={vi.fn()}
        isRejected={false}
        onSaveReview={onSaveReview}
      />,
    );

    fireEvent.click(screen.getByTitle('editReview'));
    fireEvent.click(screen.getByText('submit-edit'));

    await waitFor(() => {
      expect(onSaveReview).toHaveBeenCalledWith(
        { ...event, description: 'Unsaved edited value' },
        races,
      );
      expect(screen.getByText('edit-form')).toBeTruthy();
    });
  });
});
