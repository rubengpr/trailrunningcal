// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useFeatureFlagVariantKey } from 'posthog-js/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import es from '@/locales/es/translation.json';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { EventFeatureFeedback } from './event-feature-feedback';

vi.mock('posthog-js/react', () => ({ useFeatureFlagVariantKey: vi.fn() }));
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderFeedback() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <EventFeatureFeedback eventId="event-1" eventSlug="test-event" />
    </NextIntlClientProvider>,
  );
}

describe('EventFeatureFeedback', () => {
  it('uses the control copy by default', () => {
    vi.mocked(useFeatureFlagVariantKey).mockReturnValue(undefined);

    renderFeedback();

    expect(screen.getByRole('heading', { name: '¿Qué información buscas?' })).toBeDefined();
  });

  it('uses and tracks the more-information variant', () => {
    vi.mocked(useFeatureFlagVariantKey).mockReturnValue('more_information');

    renderFeedback();
    expect(
      screen.getByRole('heading', { name: '¿Qué más información te gustaría ver?' }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Mapa/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(track).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.EVENT_FEATURE_FEEDBACK_SUBMITTED,
      {
        event_id: 'event-1',
        event_slug: 'test-event',
        features: ['route_map'],
        comment: undefined,
        prompt_variant: 'more_information',
      },
    );
  });
});
