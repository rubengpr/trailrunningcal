// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import es from '@/locales/es/translation.json';
import type { EventImportDraft, EventImportDraftPage } from '@/types/event-import-draft.types';
import { AdminEventImportDraftsContent } from '@/components/admin/admin-event-import-drafts-content';

const mocks = vi.hoisted(() => ({ accept: vi.fn(), reject: vi.fn(), publication: vi.fn() }));
vi.mock('@/lib/api/events', () => ({
  acceptEventImportDraft: mocks.accept,
  rejectEventImportDraft: mocks.reject,
  getEventImportDraftPublicationStatus: mocks.publication,
  updateEventImportDraft: vi.fn(),
}));
vi.mock('@/components/admin/event-import-preview', () => ({ EventImportPreview: () => null }));
vi.mock('@/components/admin/event-import-preview-modal', () => ({ EventImportPreviewModal: () => null }));
vi.mock('@/components/admin/event-races-edit-modal', () => ({ EventRacesEditModal: () => null }));

function draft(id: string): EventImportDraft {
  return {
    id, sourceUrl: 'https://example.com', batchItemId: null, researchBatchItemId: null,
    status: 'draft', acceptedEventId: null, publication: null,
    data: { event: { name: `Evento ${id}`, description: null, websiteUrl: null }, races: [] },
    createdAt: '2026-10-18T00:00:00Z', updatedAt: '2026-10-18T00:00:00Z',
  };
}

function renderTable(overrides: Partial<EventImportDraftPage> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <AdminEventImportDraftsContent
        initialPage={{ drafts: [draft('1'), draft('2')], total: 2, page: 1, pageSize: 20, totalPages: 2, ...overrides }}
        query={{ page: 1, search: '', draftId: null, sortColumn: 'name', sortDirection: 'asc' }}
      />
    </NextIntlClientProvider>,
  );
}

function row(id = '1') {
  return screen.getByText(`Evento ${id}`).closest('tr')!;
}

function expectProcessed(id: string, label: string) {
  expect(within(row(id)).getByText(label).className).not.toContain('invisible');
  expect(within(row(id)).getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('AdminEventImportDraftsContent', () => {
  it('retains accepted rows, their order and pagination when all visible drafts are processed', async () => {
    mocks.accept.mockResolvedValue({ status: 'accepted' });
    renderTable();
    const firstRow = row();
    const nextButton = within(row('2')).getByTitle(es.admin.events.drafts.accept);
    const pagination = screen.getByRole('navigation');
    fireEvent.click(within(firstRow).getByTitle(es.admin.events.drafts.accept));
    await waitFor(() => expectProcessed('1', 'Aceptado'));
    expect(screen.getByText('1 borrador')).toBeTruthy();
    expect(row()).toBe(firstRow);
    expect(within(row('2')).getByTitle(es.admin.events.drafts.accept)).toBe(nextButton);
    fireEvent.click(nextButton);
    await waitFor(() => expectProcessed('2', 'Aceptado'));
    expect(screen.getByText('0 borradores')).toBeTruthy();
    expect(screen.getAllByRole('row').slice(1)).toEqual([firstRow, row('2')]);
    expect(screen.getByRole('navigation')).toBe(pagination);
  });

  it('retains a deleted row and closes its confirmation', async () => {
    mocks.reject.mockResolvedValue(undefined);
    renderTable();
    fireEvent.click(within(row()).getByTitle(es.admin.events.drafts.delete.button));
    fireEvent.click(screen.getByText(es.admin.events.drafts.delete.confirmButton, { selector: 'button' }));
    await waitFor(() => expectProcessed('1', 'Eliminado'));
    expect(screen.queryByText(es.admin.events.drafts.delete.confirmTitle)).toBeNull();
    expect(screen.getByText('1 borrador')).toBeTruthy();
    expect(mocks.reject).toHaveBeenCalledWith('1');
  });

  it('keeps failed acceptance actionable and permits retry', async () => {
    mocks.accept.mockRejectedValueOnce(new Error('Failed')).mockResolvedValueOnce({ status: 'accepted' });
    renderTable();
    const acceptButton = within(row()).getByTitle(es.admin.events.drafts.accept) as HTMLButtonElement;
    fireEvent.click(acceptButton);
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(acceptButton.disabled).toBe(false));
    expect(screen.getByText('2 borradores')).toBeTruthy();
    fireEvent.click(acceptButton);
    await waitFor(() => expectProcessed('1', 'Aceptado'));
  });

  it('keeps failed deletion pending and permits retry in the confirmation', async () => {
    mocks.reject.mockRejectedValueOnce(new Error('Failed')).mockResolvedValueOnce(undefined);
    renderTable();
    fireEvent.click(within(row()).getByTitle(es.admin.events.drafts.delete.button));
    const confirm = screen.getByText(es.admin.events.drafts.delete.confirmButton, { selector: 'button' });
    fireEvent.click(confirm);
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByText('2 borradores')).toBeTruthy();
    expect(screen.getByText(es.admin.events.drafts.delete.confirmTitle)).toBeTruthy();
    fireEvent.click(confirm);
    await waitFor(() => expectProcessed('1', 'Eliminado'));
  });

  it('marks asynchronous acceptance only after completion, without double counting overlapping polls', async () => {
    vi.useFakeTimers();
    mocks.accept.mockResolvedValue({ status: 'pending', jobId: 'job-1' });
    const completions: Array<(value: { job: { status: string } }) => void> = [];
    mocks.publication.mockImplementation(() => new Promise((resolve) => completions.push(resolve)));
    renderTable();
    await act(async () => { fireEvent.click(within(row()).getByTitle(es.admin.events.drafts.accept)); });
    expect(screen.getByText('2 borradores')).toBeTruthy();
    expect(within(row()).getByTitle(es.admin.events.drafts.accept).querySelector('.animate-spin')).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(completions).toHaveLength(2);
    await act(async () => { completions.forEach((resolve) => resolve({ job: { status: 'completed' } })); });
    expectProcessed('1', 'Aceptado');
    expect(screen.getByText('1 borrador')).toBeTruthy();
  });

  it('allows retry when asynchronous publication fails', async () => {
    mocks.accept.mockResolvedValueOnce({ status: 'pending', jobId: 'job-1' }).mockResolvedValueOnce({ status: 'accepted' });
    mocks.publication.mockResolvedValue({ job: { status: 'failed' } });
    renderTable();
    const acceptButton = within(row()).getByTitle(es.admin.events.drafts.accept) as HTMLButtonElement;
    fireEvent.click(acceptButton);
    await waitFor(() => expect(mocks.publication).toHaveBeenCalled());
    await waitFor(() => expect(acceptButton.disabled).toBe(false));
    expect(screen.getByText('2 borradores')).toBeTruthy();
    fireEvent.click(acceptButton);
    await waitFor(() => expectProcessed('1', 'Aceptado'));
  });
});
