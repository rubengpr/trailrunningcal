// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlogProvider } from '@/components/admin/blog-provider';
import { BlogDraftList } from '@/components/admin/blog-draft-list';
import { BlogDraftView } from '@/components/admin/blog-draft-view';
import es from '@/locales/es/translation.json';
import type { DraftDetail, DraftPage } from '@/types/blog-draft-record.types';

const mocks = vi.hoisted(() => ({ generateDraft: vi.fn(), listDrafts: vi.fn(), getDraft: vi.fn(), evaluateDraft: vi.fn(), replace: vi.fn(), push: vi.fn() }));
vi.mock('@/lib/api/blog-drafts', () => mocks);
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push }) }));
const pending: DraftDetail = {
  id: 'a1ff4789-cbd0-40c7-9802-92c0b97a1914', title: null, instructions: 'Una guía para la primera carrera',
  status: 'running', createdAt: '2026-10-12T10:00:00Z', updatedAt: '2026-10-12T10:00:00Z',
  contentHtml: null, primaryKeyword: null, slug: null, seoTitle: null, metaDescription: null,
  errorCode: null, evaluation: null, evaluationStatus: 'not_evaluated', evaluationErrorCode: null, editorialStatus: null, criticalCount: 0,
};
const empty: DraftPage = { drafts: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } };
const page: DraftPage = { drafts: [{ ...pending, score: null }], pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 } };
function show(children: ReactNode) {
  return render(<NextIntlClientProvider locale="es" messages={es}><BlogProvider>{children}</BlogProvider></NextIntlClientProvider>);
}
async function send(value = pending.instructions) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Generar' })));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T10:00:00Z')); vi.resetAllMocks();
  mocks.listDrafts.mockResolvedValue(page);
});

describe('connected evaluation UI', () => {
  const completed:DraftDetail = {...pending,status:'completed',title:'Artículo completo para evaluar',contentHtml:'<h2>Sección</h2><p>Contenido.</p>'};
  const evaluated:DraftDetail = {...completed,evaluationStatus:'completed',editorialStatus:'requires_corrections',criticalCount:1,evaluation:{
    score:85,createdAt:pending.createdAt,criteria:[],recommendations:[],
    criticalErrors:[{code:'missing_essential_topic',field:'article',explanation:'Falta la logística.',evidence:[{source:'instructions',quote:pending.instructions}]}],
  }};
  it('accepts once, polls the completed article, and opens the report only on request',async()=>{
    let resolve!:(value:DraftDetail)=>void;
    mocks.evaluateDraft.mockReturnValue(new Promise<DraftDetail>(r=>{resolve=r;}));
    mocks.getDraft.mockResolvedValue(evaluated);
    show(<BlogDraftView initial={completed} />);
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:es.admin.blog.evaluateArticle})));
    expect((screen.getByRole('button',{name:es.admin.blog.sending}) as HTMLButtonElement).disabled).toBe(true);
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:es.admin.blog.sending})));
    expect(mocks.evaluateDraft).toHaveBeenCalledTimes(1);
    await act(async()=>resolve({...completed,evaluationStatus:'queued'}));
    expect(screen.getByText(es.admin.blog.evaluationStates.queued)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(async()=>vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByText('85')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    const trigger=screen.getByRole('button',{name:/Ver evaluación SEO/});
    fireEvent.click(trigger);
    const dialog=screen.getByRole('dialog');
    expect(dialog.textContent?.indexOf(es.admin.blog.criticalErrors)).toBeLessThan(dialog.textContent?.indexOf(es.admin.blog.scoreBreakdown) ?? 0);
    expect(screen.getByText('Falta la logística.')).toBeTruthy();
    fireEvent.keyDown(document,{key:'Escape'});
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it('preserves the article and allows retry after a failed request',async()=>{
    mocks.evaluateDraft.mockRejectedValueOnce(new Error('Network')).mockResolvedValue({...completed,evaluationStatus:'queued'});
    show(<BlogDraftView initial={{...completed,evaluationStatus:'failed'}} />);
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:es.admin.blog.retryEvaluation})));
    expect(screen.getByText(es.admin.blog.evaluationRequestFailed)).toBeTruthy();
    expect(screen.getByText('Contenido.')).toBeTruthy();
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:es.admin.blog.retryEvaluation})));
    expect(screen.getByText(es.admin.blog.evaluationStates.queued)).toBeTruthy();
  });
  it('keeps a completed report visible after a read failure',async()=>{
    mocks.getDraft.mockRejectedValue(new Error('Network'));
    show(<BlogDraftView initial={evaluated} />);
    await act(async()=>window.dispatchEvent(new Event('focus')));
    expect(screen.getByText(es.admin.blog.readFailed)).toBeTruthy();
    expect(screen.getByText('85')).toBeTruthy();
  });
  it('renders a numeric score chip and evaluation states in the list',()=>{
    const drafts=[
      {...evaluated,score:85},
      {...completed,id:'queued',evaluationStatus:'queued' as const,score:null},
      {...completed,id:'failed',evaluationStatus:'failed' as const,score:null},
    ];
    show(<BlogDraftList initial={{drafts,pagination:{page:1,pageSize:50,total:3,totalPages:1}}} />);
    expect(screen.getByText('85')).toBeTruthy();
    expect(screen.queryByText(es.admin.blog.editorialStates.requires_corrections)).toBeNull();
    expect(screen.getByText(es.admin.blog.evaluationStates.queued)).toBeTruthy();
    expect(screen.getByText(es.admin.blog.evaluationStates.failed)).toBeTruthy();
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('connected generation UI', () => {
  it('opens the draft when clicking the date or row background and keeps the title link', () => {
    show(<BlogDraftList initial={page} />);
    const link = screen.getByRole('link', { name: pending.instructions });
    expect(link.getAttribute('href')).toBe('/es/admin/blog/'+pending.id);
    fireEvent.click(screen.getByText('12 oct 2026'));
    fireEvent.click(link.closest('tr')!);
    expect(mocks.push).toHaveBeenCalledTimes(2);
    expect(mocks.push).toHaveBeenLastCalledWith('/es/admin/blog/'+pending.id);
  });
  it.each(['', '   ', 'x'.repeat(9), 'x'.repeat(5001)])('validates input case %#', async input => {
    show(<BlogDraftList initial={empty} />); await send(input);
    expect(mocks.generateDraft).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });
  it('only clears input and adds a row after acceptance, without navigation', async () => {
    let resolve!: (value: DraftDetail) => void;
    mocks.generateDraft.mockReturnValue(new Promise<DraftDetail>(r => { resolve = r; }));
    show(<BlogDraftList initial={empty} />); await send();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(pending.instructions);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.queryByRole('link', { name: pending.instructions })).toBeNull();
    await act(async () => resolve(pending));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByRole('link', { name: pending.instructions })).toBeTruthy();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it('preserves input after rejection', async () => {
    mocks.generateDraft.mockRejectedValue(new Error('Failed'));
    show(<BlogDraftList initial={empty} />); await send();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(pending.instructions);
    expect(screen.getByText(es.admin.blog.requestFailed)).toBeTruthy();
    expect(screen.queryByRole('link', { name: pending.instructions })).toBeNull();
  });
  it('preserves input when list and detail are swapped within the section', () => {
    const tree = (children: ReactNode) => <NextIntlClientProvider locale="es" messages={es}>
      <BlogProvider>{children}</BlogProvider></NextIntlClientProvider>;
    const view = render(tree(<BlogDraftList initial={empty} />));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Input conservado en navegación' } });
    view.rerender(tree(<BlogDraftView initial={pending} />));
    view.rerender(tree(<BlogDraftList initial={empty} />));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Input conservado en navegación');
  });
  it('supports multiple accepted jobs', async () => {
    mocks.generateDraft.mockResolvedValueOnce(pending).mockResolvedValueOnce({ ...pending, id: 'second', instructions: 'Otra guía para elegir carrera' });
    show(<BlogDraftList initial={empty} />); await send(); await send('Otra guía para elegir carrera');
    expect(screen.getByRole('link', { name: pending.instructions })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Otra guía para elegir carrera' })).toBeTruthy();
  });
  it('returns to the first page after accepting on another page', async () => {
    mocks.generateDraft.mockResolvedValue(pending);
    show(<BlogDraftList initial={{ ...empty, pagination: { page: 2, pageSize: 50, total: 50, totalPages: 1 } }} />);
    await send(); expect(mocks.replace).toHaveBeenCalledWith('/es/admin/blog');
  });
  it('updates an open detail and shows no score or automatic modal', async () => {
    mocks.getDraft.mockResolvedValue({ ...pending, status: 'completed', title: 'Artículo real', contentHtml: '<h2>Sección</h2><p>Contenido real.</p>' });
    show(<BlogDraftView initial={pending} />);
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByRole('heading', { name: 'Artículo real' })).toBeTruthy();
    expect(screen.getByText('Contenido real.')).toBeTruthy();
    expect(screen.getByText('Sin evaluar')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('preserves data on read failures and does not overlap requests', async () => {
    mocks.getDraft.mockRejectedValueOnce(new Error('Network')).mockReturnValue(new Promise(() => {}));
    show(<BlogDraftView initial={pending} />);
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByText(es.admin.blog.readFailed)).toBeTruthy();
    expect(screen.getByText(es.admin.blog.generationNotice)).toBeTruthy();
    await act(async () => vi.advanceTimersByTimeAsync(12000));
    expect(mocks.getDraft).toHaveBeenCalledTimes(2);
  });
  it('shows slow jobs and aborts reads on unmount', async () => {
    mocks.getDraft.mockImplementation(() => new Promise(() => {}));
    const view = show(<BlogDraftView initial={pending} />);
    await act(async () => vi.advanceTimersByTimeAsync(30000));
    expect(screen.getByText(es.admin.blog.takingLong)).toBeTruthy();
    const signal = mocks.getDraft.mock.calls[0][1] as AbortSignal;
    view.unmount(); expect(signal.aborted).toBe(true);
  });
  it('renders a persisted completed detail directly and refreshes on focus', async () => {
    const completed = { ...pending, status: 'completed' as const, title: 'Persistido', contentHtml: '<p>Guardado.</p>' };
    mocks.getDraft.mockResolvedValue(completed);
    show(<BlogDraftView initial={completed} />);
    expect(screen.getByText('Guardado.')).toBeTruthy();
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(mocks.getDraft).toHaveBeenCalledTimes(1);
  });
  it('shows a generation failure without article or metadata', () => {
    show(<BlogDraftView initial={{ ...pending, status: 'failed', errorCode: 'invalid_content' }} />);
    expect(screen.getByText(es.admin.blog.failures.invalid_content)).toBeTruthy();
    expect(screen.queryByText(es.admin.blog.metadata)).toBeNull();
  });
});
