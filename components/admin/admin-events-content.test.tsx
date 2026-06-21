// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { EventDraft } from '@/types/event-draft.types';
import type { AdminTrailEventDetail } from '@/types/event.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface PreviewProps {
  event: TrailEventAgentEvent;
  races: TrailEventAgentRace[];
  onAccept: () => Promise<void>;
  onReject: () => void;
  onSaveReview: (
    event: TrailEventAgentEvent,
    races: TrailEventAgentRace[],
  ) => Promise<void> | void;
}

const mocks = vi.hoisted(() => ({
  generateEventDraft: vi.fn(),
  updateEventDraft: vi.fn(),
  rejectEventDraft: vi.fn(),
  acceptEventDraft: vi.fn(),
  routerPush: vi.fn(),
  routerRefresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    refresh: mocks.routerRefresh,
  }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('react-hot-toast', () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));
vi.mock('@/lib/api/event-drafts', () => ({
  generateEventDraft: mocks.generateEventDraft,
  updateEventDraft: mocks.updateEventDraft,
  rejectEventDraft: mocks.rejectEventDraft,
  acceptEventDraft: mocks.acceptEventDraft,
}));
vi.mock('@/lib/api/events', () => ({
  deleteEvent: vi.fn(),
  updateEvent: vi.fn(),
}));
vi.mock('@/components/admin/event-races-edit-modal', () => ({
  EventRacesEditModal: () => null,
}));
vi.mock('@/components/ui/base-modal', () => ({ BaseModal: () => null }));
vi.mock('@/components/admin/event-import-preview', () => ({
  EventImportPreview: ({
    event,
    races,
    onAccept,
    onReject,
    onSaveReview,
  }: PreviewProps) => (
    <div data-testid="event-import-preview">
      <span>{event.name}</span>
      <span>{event.description}</span>
      <button
        type="button"
        onClick={() =>
          void onSaveReview(
            { ...event, description: 'Edited description' },
            races,
          )
        }
      >
        save-draft
      </button>
      <button type="button" onClick={() => void onAccept()}>
        accept-draft
      </button>
      <button type="button" onClick={onReject}>
        reject-draft
      </button>
    </div>
  ),
}));

import { AdminEventsContent } from './admin-events-content';

const EVENT_ID = '7a0a4eb8-e4a4-4e8d-8d0c-1d0ed0e2cf11';
const DRAFT_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const draftData = {
  event: {
    name: 'Trail Event',
    description: 'Draft description',
    websiteUrl: 'https://example.com/event',
  },
  races: [
    {
      name: 'Trail Event - 21K',
      date: '2027-05-01',
      city: 'Barcelona',
      province: 'Barcelona',
      distanceKm: 21,
      elevationGainM: 900,
    },
  ],
};

function pendingDraft(data = draftData): EventDraft {
  return {
    id: DRAFT_ID,
    eventId: EVENT_ID,
    status: 'pending',
    data,
    createdAt: '2026-06-19T00:00:00.000Z',
    updatedAt: '2026-06-19T00:00:00.000Z',
  };
}

function eventDetail(draft: EventDraft | null): AdminTrailEventDetail {
  return {
    event: {
      id: EVENT_ID,
      name: 'Trail Event',
      slug: 'trail-event',
      websiteUrl: 'https://example.com/event',
      organizerId: null,
      description: null,
      heroImageFilename: null,
      updatedAt: null,
    },
    races: [],
    allRaceCount: 0,
    dateRange: { startDate: null, endDate: null },
    location: {
      city: null,
      province: null,
      groups: [],
      isMultipleLocations: false,
    },
    pendingDraft: draft,
  };
}

function pendingReviewButton(): HTMLButtonElement {
  return screen
    .getAllByTitle('updateSuggestion.reviewPendingDraft')
    .find((element) => !(element as HTMLButtonElement).disabled) as HTMLButtonElement;
}

function generationButton(): HTMLButtonElement {
  return screen.getByTitle(
    'updateSuggestion.button',
  ) as HTMLButtonElement;
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('AdminEventsContent event drafts', () => {
  it('signals a pending draft, disables generation, and opens review', () => {
    render(<AdminEventsContent events={[eventDetail(pendingDraft())]} />);

    expect(screen.getByTitle('updateSuggestion.pendingDraft')).toBeTruthy();
    const draftButtons = screen.getAllByTitle(
      'updateSuggestion.reviewPendingDraft',
    );
    expect(
      draftButtons.some((element) => (element as HTMLButtonElement).disabled),
    ).toBe(true);

    fireEvent.click(pendingReviewButton());

    expect(screen.getByTestId('event-import-preview')).toBeTruthy();
    expect(screen.getByText('Draft description')).toBeTruthy();
  });

  it('generates a draft and immediately opens it for review', async () => {
    mocks.generateEventDraft.mockResolvedValue(pendingDraft());
    render(<AdminEventsContent events={[eventDetail(null)]} />);

    fireEvent.click(generationButton());

    await waitFor(() => {
      expect(mocks.generateEventDraft).toHaveBeenCalledWith(EVENT_ID);
      expect(screen.getByTestId('event-import-preview')).toBeTruthy();
    });
  });

  it('persists review edits and renders the updated draft', async () => {
    const editedDraft = pendingDraft({
      ...draftData,
      event: { ...draftData.event, description: 'Edited description' },
    });
    mocks.updateEventDraft.mockResolvedValue(editedDraft);
    render(<AdminEventsContent events={[eventDetail(pendingDraft())]} />);
    fireEvent.click(pendingReviewButton());

    fireEvent.click(screen.getByText('save-draft'));

    await waitFor(() => {
      expect(mocks.updateEventDraft).toHaveBeenCalledWith(DRAFT_ID, {
        event: editedDraft.data.event,
        races: draftData.races,
      });
      expect(screen.getByText('Edited description')).toBeTruthy();
    });
  });

  it('removes a rejected draft from the row state', async () => {
    mocks.rejectEventDraft.mockResolvedValue({
      ...pendingDraft(),
      status: 'rejected',
    });
    render(<AdminEventsContent events={[eventDetail(pendingDraft())]} />);
    fireEvent.click(pendingReviewButton());

    fireEvent.click(screen.getByText('reject-draft'));

    await waitFor(() => {
      expect(mocks.rejectEventDraft).toHaveBeenCalledWith(DRAFT_ID);
      expect(screen.queryByTestId('event-import-preview')).toBeNull();
      expect(screen.queryByTitle('updateSuggestion.pendingDraft')).toBeNull();
      expect(generationButton().disabled).toBe(false);
    });
  });

  it('removes an accepted draft and refreshes server data', async () => {
    mocks.acceptEventDraft.mockResolvedValue(eventDetail(null));
    render(<AdminEventsContent events={[eventDetail(pendingDraft())]} />);
    fireEvent.click(pendingReviewButton());

    fireEvent.click(screen.getByText('accept-draft'));

    await waitFor(() => {
      expect(mocks.acceptEventDraft).toHaveBeenCalledWith(DRAFT_ID);
      expect(screen.queryByTestId('event-import-preview')).toBeNull();
      expect(mocks.routerRefresh).toHaveBeenCalledOnce();
    });
  });
});
