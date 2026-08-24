// @vitest-environment jsdom

import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import posthog from 'posthog-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { EventPageViewTracker } from './event-page-view-tracker';

vi.mock('posthog-js', () => ({ default: { __loaded: true } }));
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

beforeEach(() => {
  vi.mocked(posthog).__loaded = true;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EventPageViewTracker', () => {
  it('tracks the view once with the event location', () => {
    render(
      <EventPageViewTracker
        eventId="event-1"
        eventSlug="marato-valencia"
        province="Valencia"
        region="valencianCommunity"
      />,
    );

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.EVENT_PAGE_VIEWED, {
      event_id: 'event-1',
      event_slug: 'marato-valencia',
      locale: 'es',
      province: 'Valencia',
      region: 'valencianCommunity',
    });
  });

  it('does not track twice under StrictMode double mounting', () => {
    render(
      <StrictMode>
        <EventPageViewTracker
          eventId="event-1"
          eventSlug="marato-valencia"
          province="Valencia"
          region="valencianCommunity"
        />
      </StrictMode>,
    );

    expect(track).toHaveBeenCalledTimes(1);
  });

  it('does not track twice on re-render', () => {
    const { rerender } = render(
      <EventPageViewTracker
        eventId="event-1"
        eventSlug="marato-valencia"
        province="Valencia"
        region="valencianCommunity"
      />,
    );

    rerender(
      <EventPageViewTracker
        eventId="event-1"
        eventSlug="marato-valencia"
        province="Valencia"
        region="valencianCommunity"
      />,
    );

    expect(track).toHaveBeenCalledTimes(1);
  });

  it('sends null location for multi-location events', () => {
    render(
      <EventPageViewTracker
        eventId="event-2"
        eventSlug="cami-de-cavalls"
        province={null}
        region={null}
      />,
    );

    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.EVENT_PAGE_VIEWED, {
      event_id: 'event-2',
      event_slug: 'cami-de-cavalls',
      locale: 'es',
      province: null,
      region: null,
    });
  });

  it('waits for posthog to be initialised before tracking', () => {
    vi.useFakeTimers();
    vi.mocked(posthog).__loaded = false;

    render(
      <EventPageViewTracker
        eventId="event-1"
        eventSlug="marato-valencia"
        province="Valencia"
        region="valencianCommunity"
      />,
    );

    expect(track).not.toHaveBeenCalled();

    vi.mocked(posthog).__loaded = true;
    vi.advanceTimersByTime(200);

    expect(track).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
