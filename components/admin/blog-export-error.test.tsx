// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlogExportError } from './blog-export-error';
import messages from '@/locales/es/translation.json';
afterEach(cleanup);
describe('export error modal', () => {
  it('shows validation in a dialog and supports closing with Escape', () => {
    const close = vi.fn();
    render(<NextIntlClientProvider locale="es" messages={messages}><BlogExportError error="missing_publication" onClose={close} /></NextIntlClientProvider>);
    expect(screen.getByRole('dialog').textContent).toContain('Guarda un autor y una fecha de publicación válidos.');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
  });
  it('allows closing a server failure with the modal button', () => {
    const close = vi.fn();
    render(<NextIntlClientProvider locale="es" messages={messages}><BlogExportError error="export_failed" onClose={close} /></NextIntlClientProvider>);
    fireEvent.click(screen.getByRole('dialog').querySelector('button')!); expect(close).toHaveBeenCalledOnce();
  });
});
