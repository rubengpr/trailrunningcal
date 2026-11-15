// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import es from '@/locales/es/translation.json';
import ImportItemDownloadMenu from './import-item-download-menu';

const mocks = vi.hoisted(() => ({
  getArtifacts: vi.fn(),
  triggerDownload: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/lib/api/events', () => ({ getEventImportItemArtifacts: mocks.getArtifacts }));
vi.mock('@/lib/utils/download', () => ({ triggerDownload: mocks.triggerDownload }));
vi.mock('react-hot-toast', () => ({ default: { error: mocks.showError } }));

function renderMenu(available = true) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ImportItemDownloadMenu itemId="item-1" url="https://www.example.com/event" available={available} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('ImportItemDownloadMenu', () => {
  it('loads artifacts on demand and reuses them for both downloads', async () => {
    mocks.getArtifacts.mockResolvedValue({ markdown: '# Crawl', rawModelOutput: '{"raw":true}' });
    renderMenu();
    expect(mocks.getArtifacts).not.toHaveBeenCalled();

    const trigger = screen.getByRole('button', { name: 'Acciones' });
    fireEvent.click(trigger);
    expect((screen.getByText('Markdown') as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect((screen.getByText('Markdown') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByText('Markdown'));
    expect(mocks.triggerDownload).toHaveBeenCalledWith('# Crawl', 'crawl-example.com.md', 'text/markdown');

    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('JSON'));
    expect(mocks.triggerDownload).toHaveBeenCalledWith('{"raw":true}', 'model-raw-example.com.json', 'application/json;charset=utf-8');
    expect(mocks.getArtifacts).toHaveBeenCalledExactlyOnceWith('item-1');
  });

  it('keeps a failed crawl downloadable without enabling missing JSON', async () => {
    mocks.getArtifacts.mockResolvedValue({ markdown: '# Failed crawl', rawModelOutput: null });
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Acciones' }));
    await waitFor(() => expect((screen.getByText('Markdown') as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByText('JSON') as HTMLButtonElement).disabled).toBe(true);
  });

  it('reports a load failure and retries when the menu is reopened', async () => {
    mocks.getArtifacts.mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce({ markdown: '# Crawl', rawModelOutput: null });
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Acciones' });
    fireEvent.click(trigger);
    await waitFor(() => expect(mocks.showError).toHaveBeenCalledOnce());
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    await waitFor(() => expect((screen.getByText('Markdown') as HTMLButtonElement).disabled).toBe(false));
    expect(mocks.getArtifacts).toHaveBeenCalledTimes(2);
  });

  it('does not load artifacts for a pending item', () => {
    renderMenu(false);
    fireEvent.click(screen.getByRole('button', { name: 'Acciones' }));
    expect(mocks.getArtifacts).not.toHaveBeenCalled();
    expect((screen.getByText('Markdown') as HTMLButtonElement).disabled).toBe(true);
  });
});
