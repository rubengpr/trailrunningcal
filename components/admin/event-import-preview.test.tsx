// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import es from '@/locales/es/translation.json';
import { EventImportPreview } from './event-import-preview';

afterEach(cleanup);

describe('EventImportPreview race tiers', () => {
  it('shows extracted paid and free tiers without requiring pricing', () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <EventImportPreview
          event={{
            name: 'Trail Event',
            description: null,
            websiteUrl: 'https://example.com',
          }}
          races={[
            {
              name: '21K',
              date: '2027-05-01',
              city: 'Barcelona',
              province: 'Barcelona',
              distanceKm: 21,
              elevationGainM: 900,
              tiers: [
                { priceEur: 35, endsAt: '2027-01-31' },
                { priceEur: 45, endsAt: '2027-02-28' },
              ],
            },
            {
              name: '10K',
              date: '2027-05-01',
              city: 'Barcelona',
              province: 'Barcelona',
              distanceKm: 10,
              elevationGainM: 300,
              tiers: [{ priceEur: 0, endsAt: null }],
            },
            {
              name: '5K',
              date: '2027-05-01',
              city: 'Barcelona',
              province: 'Barcelona',
              distanceKm: 5,
              elevationGainM: 100,
              tiers: [],
            },
          ]}
          isLoading={false}
          error={null}
          onAccept={vi.fn()}
          isAccepted={false}
          isAccepting={false}
          onReject={vi.fn()}
          isRejected={false}
          onSaveReview={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(/35/).textContent).toContain('hasta 31/01/2027');
    expect(screen.getByText(/45/).textContent).toContain('hasta 28/02/2027');
    expect(screen.getByText('Gratis')).toBeTruthy();
    expect(screen.getByText('5K')).toBeTruthy();
  });

  it('can hide rejection while keeping accepted previews immutable', () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <EventImportPreview
          event={{ name: 'Accepted Event', description: null, websiteUrl: null }}
          races={[{
            name: '10K',
            date: '2027-05-01',
            city: 'Girona',
            province: 'Girona',
            distanceKm: 10,
            elevationGainM: 300,
            tiers: [],
          }]}
          isLoading={false}
          error={null}
          onAccept={vi.fn()}
          isAccepted
          isAccepting={false}
          onReject={vi.fn()}
          isRejected={false}
          showReject={false}
          onSaveReview={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByTitle('Rechazar evento')).toBeNull();
    expect(screen.getByTitle('Editar')).toHaveProperty('disabled', true);
    expect(screen.getByTitle('Evento aceptado')).toHaveProperty('disabled', true);
  });
});
