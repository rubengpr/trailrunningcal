// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { NewsletterForm } from './newsletter-form';

vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

describe('NewsletterForm', () => {
  it('tracks a subscription-button click without capturing the email address', () => {
    render(
      <NewsletterForm
        locale="es"
        emailLabel="Tu email"
        emailPlaceholder="Tu email"
        submitLabel="Suscribirme"
      />,
    );

    fireEvent.change(screen.getByLabelText('Tu email'), {
      target: { value: 'runner@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Suscribirme' }));

    expect(track).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.NEWSLETTER_SUBSCRIBE_CLICKED,
      { locale: 'es' },
    );
  });
});
