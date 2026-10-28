// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArticleDocument, ImageBlock } from '@/types/blog-article-block.types';
const mocks = vi.hoisted(() => ({ add: vi.fn(), edit: vi.fn(), replace: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/api/blog-article-images', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/api/blog-article-images')>(), addImage: mocks.add, editImage: mocks.edit, replaceImage: mocks.replace, removeImage: mocks.remove }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));
import { ArticleImageError } from '@/lib/api/blog-article-images';
import { BlogArticleEditor } from './blog-article-editor';
import messages from '@/locales/es/translation.json';
const image: ImageBlock = { id: 'image', type: 'image', path: 'private/path.png', alt: 'Montserrat', caption: 'Una cima', metadata: { width: 600, height: 400, bytes: 1000, format: 'png' } };
const initial: ArticleDocument = { version: 0, blocks: [{ id: 'text-0', type: 'text', html: '<p>Primer párrafo</p>' }, image, { id: 'text-1', type: 'text', html: '<h2>Evento</h2><p>Segundo párrafo</p>' }] };
function Harness() {
  const [document, setDocument] = useState(initial);
  return <NextIntlClientProvider locale="es" messages={messages}><BlogArticleEditor id="draft" document={document} links={[]} onSaved={setDocument} /></NextIntlClientProvider>;
}
beforeEach(() => vi.resetAllMocks()); afterEach(cleanup);
describe('inline article images', () => {
  it('renders the original text and offers insertion at every boundary', () => {
    render(<Harness />); expect(screen.getAllByRole('button', { name: 'Añadir imagen' })).toHaveLength(4);
    expect(screen.getByText('Primer párrafo')).toBeTruthy(); expect(screen.getByText('Segundo párrafo')).toBeTruthy();
    expect(screen.getByText('Una cima')).toBeTruthy(); expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('inserts directly after the chosen block without editing the text', async () => {
    mocks.add.mockResolvedValue({ ...initial, version: 1 }); render(<Harness />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Añadir imagen' })[1]);
    fireEvent.change(screen.getByLabelText('Seleccionar imagen para el artículo'), { target: { files: [new File(['png'], 'x.png', { type: 'image/png' })] } });
    await waitFor(() => expect(mocks.add).toHaveBeenCalledWith('draft', expect.any(File), 'text-0', 0));
    expect(screen.getByText('Primer párrafo')).toBeTruthy();
  });
  it('edits alt text and captions with custom errors, preserving input', async () => {
    mocks.edit.mockRejectedValue(new ArticleImageError(409, 'article_conflict')); render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar imagen' }));
    fireEvent.change(screen.getByLabelText('Alt text'), { target: { value: 'Otra descripción' } });
    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/ }));
    await screen.findByText('El artículo ha cambiado. Recarga la página antes de guardar de nuevo.');
    expect((screen.getByLabelText('Alt text') as HTMLInputElement).value).toBe('Otra descripción');
    expect(mocks.edit).toHaveBeenCalledWith('draft', 'image', { action: 'update', alt: 'Otra descripción', caption: 'Una cima', version: 0 });
  });
  it('moves and deletes image blocks while preserving every text block', async () => {
    mocks.edit.mockResolvedValue({ version: 1, blocks: [image, initial.blocks[0], initial.blocks[2]] });
    mocks.remove.mockResolvedValue({ version: 2, blocks: [initial.blocks[0], initial.blocks[2]] }); render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Mover imagen arriba' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Mover imagen arriba' }) as HTMLButtonElement).disabled).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar imagen' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Eliminar imagen' })).toBeNull());
    expect(screen.getByText('Primer párrafo')).toBeTruthy(); expect(screen.getByText('Segundo párrafo')).toBeTruthy();
  });
  it('opens an image preview without a mutation', () => {
    render(<Harness />); fireEvent.click(screen.getByRole('button', { name: 'Ampliar imagen' }));
    expect(screen.getByRole('dialog')).toBeTruthy(); expect(mocks.edit).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('dialog')).toBeNull();
  });
});
