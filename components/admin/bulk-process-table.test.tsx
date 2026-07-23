// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import es from '@/locales/es/translation.json';
import type { BulkProcessTableRow } from './bulk-process-table';
import { BulkProcessTable } from './bulk-process-table';

const mocks = vi.hoisted(() => ({
  triggerDownload: vi.fn(),
}));

vi.mock('@/lib/utils/download', () => ({
  triggerDownload: mocks.triggerDownload,
}));

const rows: BulkProcessTableRow[] = [
  {
    id: 'item-completed',
    url: 'https://example.com/completed',
    status: 'completed',
    reviewStatus: 'pending',
    acceptedEventId: null,
    raceCount: 1,
    error: null,
    updatedAt: '2026-07-22T10:00:00.000Z',
    markdown: '# Completed event',
    rawModelOutput: '{"raw":true}',
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
  {
    id: 'item-failed',
    url: 'https://failed.example.com/event',
    status: 'failed',
    reviewStatus: 'pending',
    acceptedEventId: null,
    raceCount: null,
    error: 'Extraction failed',
    updatedAt: '2026-07-22T12:00:00.000Z',
    markdown: '# Failed crawl',
    rawModelOutput: null,
  },
];

function renderTable(props?: { viewingRowId?: string | null }) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <BulkProcessTable
        rows={rows}
        viewingRowId={props?.viewingRowId}
        onViewResult={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('BulkProcessTable', () => {
  it('uses the shared table presentation and highlights accepted rows', () => {
    renderTable();

    expect(screen.getByText('URL').closest('tr')?.className).toContain('bg-gray-100');
    expect(screen.getByText('URL').closest('div.w-full')?.className).toContain('text-sm');
    const acceptedRow = screen.getByText('example.com/accepted').closest('tr');
    expect(acceptedRow?.className).toContain('bg-green-50');
    const eventLink = screen.getByRole('link', { name: 'Ver evento' });
    expect(eventLink.getAttribute('href')).toBe('/es/admin/eventos/event-1');
    expect(eventLink.querySelector('svg')).toBeTruthy();
  });

  it('keeps preview separate from the download menu and reflects loading availability', () => {
    renderTable({ viewingRowId: 'item-completed' });

    const loadingButton = screen.getByTitle('Cargando...') as HTMLButtonElement;
    expect(loadingButton.disabled).toBe(true);
    expect(loadingButton.querySelector('.animate-spin')).toBeTruthy();

    const previewButtons = screen.getAllByTitle('Ver resultado') as HTMLButtonElement[];
    expect(previewButtons).toHaveLength(2);
    expect(previewButtons.every((button) => button.disabled)).toBe(true);

    fireEvent.click(screen.getAllByRole('button', { name: 'Acciones' })[0]);
    expect(screen.queryByText('Ver resultado')).toBeNull();
    expect(screen.getByText('Markdown')).toBeTruthy();
    expect(screen.getByText('JSON')).toBeTruthy();
  });

  it('downloads stored Markdown and untouched raw model JSON', () => {
    renderTable();
    const actionMenus = screen.getAllByRole('button', { name: 'Acciones' });

    fireEvent.click(actionMenus[0]);
    fireEvent.click(screen.getByText('Markdown'));
    expect(mocks.triggerDownload).toHaveBeenCalledWith(
      '# Completed event',
      'crawl-example.com.md',
      'text/markdown',
    );

    fireEvent.click(actionMenus[0]);
    fireEvent.click(screen.getByText('JSON'));
    expect(mocks.triggerDownload).toHaveBeenCalledWith(
      '{"raw":true}',
      'model-raw-example.com.json',
      'application/json;charset=utf-8',
    );
  });

  it('disables only downloads whose stored content is unavailable', () => {
    renderTable();
    fireEvent.click(screen.getAllByRole('button', { name: 'Acciones' })[2]);

    expect((screen.getByText('Markdown') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByText('JSON') as HTMLButtonElement).disabled).toBe(true);
  });
});
