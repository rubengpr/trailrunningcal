// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import es from '@/locales/es/translation.json';
import { BulkProcessTable } from './bulk-process-table';

afterEach(cleanup);

describe('BulkProcessTable review state', () => {
  it('highlights accepted rows and links them to the event', () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <BulkProcessTable
          rows={[
            {
              id: 'item-pending',
              url: 'https://example.com/pending',
              status: 'completed',
              reviewStatus: 'pending',
              acceptedEventId: null,
              raceCount: 1,
              error: null,
              updatedAt: '2026-07-22T10:00:00.000Z',
              markdown: null,
              rawModelOutput: null,
            },
            {
              id: 'item-accepted',
              url: 'https://example.com/accepted',
              status: 'completed',
              reviewStatus: 'accepted',
              acceptedEventId: 'event-1',
              raceCount: 2,
              error: null,
              updatedAt: '2026-07-22T11:00:00.000Z',
              markdown: null,
              rawModelOutput: null,
            },
          ]}
          onViewResult={() => undefined}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByText('Revisión')).toBeNull();
    const pendingRow = screen.getByText('example.com/pending').closest('tr');
    const acceptedRow = screen.getByText('example.com/accepted').closest('tr');
    expect(pendingRow?.className).not.toContain('bg-green-50');
    expect(acceptedRow?.className).toContain('bg-green-50');
    expect(acceptedRow?.closest('table')?.className).toContain('border-spacing-0');
    const eventLink = screen.getByRole('link', { name: 'Ver evento' });
    expect(eventLink.getAttribute('href')).toBe('/es/admin/eventos/event-1');
    expect(eventLink.textContent).toBe('');
    expect(eventLink.querySelector('svg')).toBeTruthy();
    const actionMenus = screen.getAllByRole('button', { name: 'Acciones' });
    expect(actionMenus).toHaveLength(2);
    fireEvent.click(actionMenus[1]);
    expect(screen.getByText('Ver resultado')).toBeTruthy();
  });
});
