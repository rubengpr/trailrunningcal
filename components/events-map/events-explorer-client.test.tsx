// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicEventDetail } from '@/types/event.types';
import type { PublicEventPage } from '@/types/public-events.types';

const mocks = vi.hoisted(() => ({
  getPublicEventPage: vi.fn(),
  featureFlagVariant: vi.fn((_key: string): string => 'control'),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (
    key: string,
    values?: Record<string, number>,
  ) => values ? `${key}:${values.count}/${values.total}` : key,
}));
vi.mock('posthog-js/react', () => ({
  useFeatureFlagVariantKey: (key: string) => mocks.featureFlagVariant(key),
}));
vi.mock('@/lib/api/events', () => ({
  getPublicEventPage: mocks.getPublicEventPage,
}));
vi.mock('@/components/events-map/events-explorer-filters-section', () => ({
  EventsExplorerFiltersSection: ({
    onMonthSelect,
  }: {
    onMonthSelect: (months: string[]) => void;
  }) => (
    <button onClick={() => onMonthSelect(['9'])}>filter-october</button>
  ),
}));
vi.mock('@/components/sponsors/sponsor-banner-slot', () => ({
  SponsorBannerSlot: () => null,
}));
vi.mock('@/components/event/event-card', () => ({
  EventCard: ({
    eventDetail,
    isFeatured,
  }: {
    eventDetail: PublicEventDetail;
    isFeatured: boolean;
  }) => (
    <div data-testid="event-card" data-featured={String(isFeatured)}>
      {eventDetail.event.id}
    </div>
  ),
}));
vi.mock('@/components/ui/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/components/events-map/deferred-events-map', () => ({
  DeferredEventsMap: () => null,
}));
vi.mock('@/hooks/use-min-width-lg', () => ({ useMinWidthLg: () => false }));
vi.mock('@/hooks/use-scroll-edges', () => ({
  useScrollEdges: () => ({ canScrollLeft: false, canScrollRight: false }),
}));
vi.mock('@/components/providers/mobile-filters-provider', () => ({
  useMobileFilters: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    updateFilterCount: vi.fn(),
    updateFilterVariant: vi.fn(),
    filterCount: 0,
  }),
}));
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

import { EventsExplorerClient } from './events-explorer-client';

function event(id: string, slug = `event-${id}`): PublicEventDetail {
  return {
    event: { id, name: `Event ${id}`, slug },
    races: [{
      id: `race-${id}`,
      name: null,
      date: '2026-10-01',
      distanceKm: 20,
      elevationGainM: 500,
      city: 'Girona',
      province: 'Girona',
    }],
    dateRange: { startDate: '2026-10-01', endDate: '2026-10-01' },
    location: {
      city: 'Girona',
      province: 'Girona',
      groups: [{ province: 'Girona', cities: ['Girona'] }],
      isMultipleLocations: false,
    },
  };
}

function page(overrides: Partial<PublicEventPage> = {}): PublicEventPage {
  return {
    events: [event('one')],
    page: 1,
    total: 101,
    hasMore: true,
    referenceDate: '2026-08-06',
    ...overrides,
  };
}

const labels = {
  previousEvent: 'previous',
  nextEvent: 'next',
  eventPageLink: 'event',
  dateTbd: 'unknown',
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.featureFlagVariant.mockReturnValue('control');
  sessionStorage.clear();
});

afterEach(cleanup);

describe('EventsExplorerClient featured card experiment', () => {
  function enrollInFeaturedArm() {
    mocks.featureFlagVariant.mockImplementation((key) =>
      key === 'featured-event-card' ? 'featured' : 'control',
    );
  }

  function renderWithFeaturedEvent() {
    render(
      <EventsExplorerClient
        initialPage={page({
          events: [event('one', 'burriac-atac')],
          total: 1,
          hasMore: false,
        })}
        locale="es"
        labels={labels}
      />,
    );
    return screen.getByTestId('event-card');
  }

  it('reads the flag so every visitor is exposed, not just those who see a featured card', () => {
    render(
      <EventsExplorerClient
        initialPage={page({ total: 1, hasMore: false })}
        locale="es"
        labels={labels}
      />,
    );

    expect(mocks.featureFlagVariant).toHaveBeenCalledWith('featured-event-card');
  });

  it('keeps a featured slug on the normal treatment for the control arm', () => {
    expect(renderWithFeaturedEvent().dataset.featured).toBe('false');
  });

  it('applies the featured treatment to a featured slug for the featured arm', () => {
    enrollInFeaturedArm();

    expect(renderWithFeaturedEvent().dataset.featured).toBe('true');
  });

  it('leaves non-featured slugs alone in the featured arm', () => {
    enrollInFeaturedArm();
    render(
      <EventsExplorerClient
        initialPage={page({ total: 1, hasMore: false })}
        locale="es"
        labels={labels}
      />,
    );

    expect(screen.getByTestId('event-card').dataset.featured).toBe('false');
  });
});

describe('EventsExplorerClient pagination', () => {
  it('requests and appends the next page after Load more succeeds', async () => {
    mocks.getPublicEventPage.mockResolvedValue(page({
      events: [event('two')],
      page: 2,
      total: 101,
      hasMore: false,
    }));
    render(
      <EventsExplorerClient
        initialPage={page()}
        locale="es"
        labels={labels}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'loadMore' }));

    await waitFor(() => {
      expect(screen.getAllByTestId('event-card')).toHaveLength(2);
    });
    expect(mocks.getPublicEventPage).toHaveBeenCalledWith(
      {
        page: 2,
        referenceDate: '2026-08-06',
        filters: {
          months: [],
          provinces: [],
          distanceRanges: [],
          raceTypes: [],
        },
        scope: undefined,
      },
      expect.any(AbortSignal),
    );
    expect(screen.queryByRole('button', { name: 'loadMore' })).toBeNull();
  });

  it('resets to page one when a filter changes', async () => {
    mocks.getPublicEventPage.mockResolvedValue(page({
      events: [event('october')],
      total: 1,
      hasMore: false,
    }));
    render(
      <EventsExplorerClient
        initialPage={page()}
        locale="es"
        labels={labels}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'filter-october' }));

    await waitFor(() => {
      expect(screen.getByText('october')).toBeDefined();
    });
    expect(mocks.getPublicEventPage).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        filters: expect.objectContaining({ months: [9] }),
      }),
      expect.any(AbortSignal),
    );
  });

  it('cancels and ignores a stale load-more response when filters change', async () => {
    let loadMoreSignal: AbortSignal | undefined;
    let resolveLoadMore!: (value: PublicEventPage) => void;
    mocks.getPublicEventPage
      .mockImplementationOnce((_input, signal?: AbortSignal) => {
        loadMoreSignal = signal;
        return new Promise<PublicEventPage>((resolve) => {
          resolveLoadMore = resolve;
        });
      })
      .mockResolvedValueOnce(page({
        events: [event('october')],
        total: 1,
        hasMore: false,
      }));

    render(
      <EventsExplorerClient
        initialPage={page()}
        locale="es"
        labels={labels}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'loadMore' }));
    fireEvent.click(screen.getByRole('button', { name: 'filter-october' }));

    await waitFor(() => {
      expect(screen.getByText('october')).toBeDefined();
    });
    expect(loadMoreSignal?.aborted).toBe(true);

    act(() => {
      resolveLoadMore(page({
        events: [event('stale')],
        page: 2,
        total: 101,
        hasMore: false,
      }));
    });

    await waitFor(() => {
      expect(screen.queryByText('stale')).toBeNull();
      expect(screen.getAllByTestId('event-card')).toHaveLength(1);
    });
  });
});
