// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Publication } from '@/types/blog-publication.types';
const mocks = vi.hoisted(() => ({ details: vi.fn(), image: vi.fn(), remove: vi.fn(), metadata: vi.fn() }));
vi.mock('@/lib/api/blog-publication', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/api/blog-publication')>(), saveDetails: mocks.details, saveImage: mocks.image, removeImage: mocks.remove, getImageMetadata: mocks.metadata }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));
import { BlogPublicationEditor } from './blog-publication-editor';
import { BlogPublicationImage } from './blog-publication-image';
import { PublicationError } from '@/lib/api/blog-publication';
import { today } from '@/lib/blog/publication';
import messages from '@/locales/es/translation.json';
const publication: Publication = { author: null, date: null, imagePath: null, imageAlt: null, version: 0 };
const show = (child: ReactNode) => render(<NextIntlClientProvider locale="es" messages={messages}>{child}</NextIntlClientProvider>);
beforeEach(() => { vi.resetAllMocks(); mocks.metadata.mockResolvedValue({ width: 1200, height: 800, bytes: 153600, format: 'jpeg' }); });
afterEach(cleanup);
describe('publication editor', () => {
  it('uses defaults and cancels without saving', () => {
    const close = vi.fn();
    show(<BlogPublicationEditor id="id" publication={publication} onSaved={vi.fn()} onClose={close} />);
    expect((screen.getByLabelText('Autor') as HTMLInputElement).value).toBe('Ruben Godoy');
    expect((screen.getByLabelText('Fecha de publicación') as HTMLInputElement).value).toBe(today());
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' }).at(-1)!);
    expect(mocks.details).not.toHaveBeenCalled();
  });
  it('preserves unsaved values across polling and saves once', async () => {
    const saved = vi.fn(), close = vi.fn();
    const view = show(<BlogPublicationEditor id="id" publication={publication} onSaved={saved} onClose={close} />);
    fireEvent.change(screen.getByLabelText('Autor'), { target: { value: 'Otro autor' } });
    view.rerender(<NextIntlClientProvider locale="es" messages={messages}><BlogPublicationEditor id="id" publication={{ ...publication, author: 'Servidor' }} onSaved={saved} onClose={close} /></NextIntlClientProvider>);
    expect((screen.getByLabelText('Autor') as HTMLInputElement).value).toBe('Otro autor');
    let resolve!: (value: Publication) => void;
    mocks.details.mockReturnValue(new Promise<Publication>(done => { resolve = done; }));
    fireEvent.submit(screen.getByRole('dialog')); fireEvent.submit(screen.getByRole('dialog'));
    expect(mocks.details).toHaveBeenCalledTimes(1);
    resolve({ ...publication, author: 'Otro autor', version: 1 });
    await waitFor(() => expect(close).toHaveBeenCalledOnce()); expect(saved).toHaveBeenCalledOnce();
  });
  it('keeps input and modal open after a failed save', async () => {
    mocks.details.mockRejectedValue(new PublicationError(409, 'publication_conflict'));
    const close = vi.fn(); show(<BlogPublicationEditor id="id" publication={publication} onSaved={vi.fn()} onClose={close} />);
    fireEvent.submit(screen.getByRole('dialog'));
    await screen.findByText('Los datos han cambiado. Recarga la página antes de guardar de nuevo.');
    expect(close).not.toHaveBeenCalled(); expect((screen.getByLabelText('Autor') as HTMLInputElement).value).toBe('Ruben Godoy');
  });
  it('edits author and date without requiring or submitting alt text', async () => {
    show(<BlogPublicationEditor id="id" publication={{ ...publication, imagePath: 'id/photo.png' }} onSaved={vi.fn()} onClose={vi.fn()} />);
    mocks.details.mockResolvedValue(publication);
    expect(screen.queryByLabelText('Texto alternativo de la imagen')).toBeNull();
    fireEvent.submit(screen.getByRole('dialog'));
    await waitFor(() => expect(mocks.details).toHaveBeenCalledWith('id', { author: 'Ruben Godoy', date: today(), version: 0 }));
  });
});
describe('publication image', () => {
  it('shows saved image dimensions, weight and format', async () => {
    show(<BlogPublicationImage id="id" publication={{ ...publication, imagePath: 'id/photo.png' }} onSaved={vi.fn()} />);
    expect(await screen.findByText('1200 × 800 px · 150 KB · JPEG')).toBeTruthy();
  });
  it('opens an enlarged preview and closes with Escape without uploading', () => {
    show(<BlogPublicationImage id="id" publication={{ ...publication, imagePath: 'id/photo.png', imageAlt: 'Montserrat' }} onSaved={vi.fn()} />);
    const thumbnail = screen.getByRole('button', { name: 'Ampliar imagen' });
    thumbnail.focus(); fireEvent.click(thumbnail);
    const dialog = screen.getByRole('dialog', { name: 'Imagen del artículo' });
    expect(dialog.querySelector('img')?.getAttribute('alt')).toBe('Montserrat');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(thumbnail);
    expect(mocks.image).not.toHaveBeenCalled();
  });
  it('uploads a dropped file immediately and blocks repeated actions', async () => {
    const saved = vi.fn(); let resolve!: (value: Publication) => void;
    mocks.image.mockReturnValue(new Promise<Publication>(done => { resolve = done; }));
    show(<BlogPublicationImage id="id" publication={publication} onSaved={saved} />);
    fireEvent.drop(screen.getByRole('button', { name: /Arrastra una imagen/ }), { dataTransfer: { files: [new File(['png'], 'photo.png', { type: 'image/png' })] } });
    expect(mocks.image).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Guardar imagen' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
    expect((screen.getByRole('button', { name: 'Eliminar imagen' }) as HTMLButtonElement).disabled).toBe(true);
    resolve({ ...publication, imagePath: 'id/photo.png', version: 1 });
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  });
  it('preserves failed selections for retry or discard', async () => {
    mocks.image.mockRejectedValue(new Error('network'));
    show(<BlogPublicationImage id="id" publication={publication} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Seleccionar imagen'), { target: { files: [new File(['png'], 'photo.png', { type: 'image/png' })] } });
    await screen.findByText('No se han podido guardar los cambios. Vuelve a intentarlo.');
    expect(screen.getByText('photo.png')).toBeTruthy(); expect(mocks.image).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar imagen' }));
    expect(screen.getByRole('button', { name: /Arrastra una imagen/ })).toBeTruthy();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('removes saved images only after the server accepts deletion', async () => {
    const saved = vi.fn(); let resolve!: (value: Publication) => void;
    mocks.remove.mockReturnValue(new Promise<Publication>(done => { resolve = done; }));
    show(<BlogPublicationImage id="id" publication={{ ...publication, imagePath: 'id/photo.png', version: 2 }} onSaved={saved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar imagen' }));
    expect(mocks.remove).toHaveBeenCalledWith('id', 2); expect(saved).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Ampliar imagen' })).toBeTruthy();
    resolve({ ...publication, version: 3 });
    await waitFor(() => expect(saved).toHaveBeenCalledWith({ ...publication, version: 3 }));
  });
  it('keeps the existing image after a deletion error', async () => {
    mocks.remove.mockRejectedValue(new Error('network'));
    const saved = vi.fn();
    show(<BlogPublicationImage id="id" publication={{ ...publication, imagePath: 'id/photo.png' }} onSaved={saved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar imagen' }));
    await screen.findByText('No se han podido guardar los cambios. Vuelve a intentarlo.');
    expect(screen.getByRole('button', { name: 'Ampliar imagen' })).toBeTruthy(); expect(saved).not.toHaveBeenCalled();
  });
  it('rejects multiple files and shows missing alt text without an edit link', () => {
    show(<BlogPublicationImage id="id" publication={{ ...publication, imagePath: 'id/photo.png' }} onSaved={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Arrastra/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Reemplazar' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Seleccionar imagen'), { target: { files: [new File(['a'], 'a.png'), new File(['b'], 'b.png')] } });
    expect(screen.getByText('Selecciona una sola imagen.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.getByLabelText('La imagen todavía no tiene texto alternativo.')).toBeTruthy();
    expect(screen.queryByText('La imagen todavía no tiene texto alternativo.')).toBeNull();
  });
});
