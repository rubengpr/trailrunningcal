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

const mocks = vi.hoisted(() => ({ generateDraft: vi.fn(), listEvents: vi.fn(), listDrafts: vi.fn(), getDraft: vi.fn(), evaluateDraft: vi.fn(), deleteDraft: vi.fn(), replace: vi.fn(), push: vi.fn(), refresh: vi.fn(),
  DraftRequestError: class extends Error { constructor(public readonly status:number) {super('Request failed');} },
}));
vi.mock('@/lib/api/blog-drafts', () => mocks);
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push, refresh: mocks.refresh }) }));
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
const candidates = Array.from({length: 6}, (_, index) => ({id: `event-${index}`, name: `Evento ${index + 1}`, slug: `evento-${index}`, description: null,
  races: [{id: `race-${index}`, name: null, city: 'Bagà', province: 'Barcelona', distanceKm: 21, elevationGainM: null}]}));
async function chooseRegion(name = 'Cataluña') {
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', {name}));
  await act(async () => vi.advanceTimersByTimeAsync(250));
}
async function selectEvents(count = 5) {
  if (!screen.queryByRole('searchbox')) await chooseRegion();
  const boxes = screen.getAllByRole('checkbox').slice(0, count);
  boxes.forEach(box => { if (!(box as HTMLInputElement).checked) fireEvent.click(box); });
}
async function send() {
  await selectEvents();
  await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Generar'})));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T10:00:00Z')); vi.resetAllMocks();
  mocks.listDrafts.mockResolvedValue(page);
  mocks.listEvents.mockResolvedValue({events: candidates, pagination: {page: 1, pageSize: 50, total: 6, totalPages: 1}});
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
  it.each([0, 1, 2, 3, 4])('rejects %s selected events', async count => {
    show(<BlogDraftList initial={empty} />); await selectEvents(count);
    await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Generar'})));
    expect(mocks.generateDraft).not.toHaveBeenCalled();
    expect(screen.getByText(es.admin.blog.selection.required)).toBeTruthy();
  });
  it('clears selection only after acceptance and preserves the community without navigation', async () => {
    let resolve!: (value: DraftDetail) => void;
    mocks.generateDraft.mockReturnValue(new Promise<DraftDetail>(r => {resolve = r;}));
    show(<BlogDraftList initial={empty} />); await send();
    expect(screen.getByText('5/5 eventos')).toBeTruthy();
    expect((screen.getByRole('combobox') as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.generateDraft).toHaveBeenCalledWith({regionId: 'catalonia', eventIds: candidates.slice(0,5).map(event => event.id)}, expect.any(AbortSignal));
    await act(async () => fireEvent.click(screen.getByRole('button', {name: es.admin.blog.sending})));
    expect(mocks.generateDraft).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link', {name: pending.instructions})).toBeNull();
    await act(async () => resolve(pending));
    expect(screen.getByText('0/5 eventos')).toBeTruthy();
    expect(screen.getByRole('combobox').textContent).toContain('Cataluña');
    expect(screen.getByRole('link', {name: pending.instructions})).toBeTruthy();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it('preserves selection after rejection', async () => {
    mocks.generateDraft.mockRejectedValue(new Error('Failed'));
    show(<BlogDraftList initial={empty} />); await send();
    expect(screen.getByText('5/5 eventos')).toBeTruthy();
    expect(screen.getByText(es.admin.blog.selection.requestFailed)).toBeTruthy();
    expect(screen.queryByRole('link', {name: pending.instructions})).toBeNull();
  });
  it('preserves selection while navigating within Blog', async () => {
    const tree = (children: ReactNode) => <NextIntlClientProvider locale="es" messages={es}><BlogProvider>{children}</BlogProvider></NextIntlClientProvider>;
    const view = render(tree(<BlogDraftList initial={empty} />)); await selectEvents(1);
    view.rerender(tree(<BlogDraftView initial={pending} />));
    view.rerender(tree(<BlogDraftList initial={empty} />));
    expect(screen.getByText('1/5 eventos')).toBeTruthy();
  });
  it('clears selection when changing community and omits excluded territories', async () => {
    show(<BlogDraftList initial={empty} />); await selectEvents(2);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('option', {name: 'Andorra'})).toBeNull();
    expect(screen.queryByRole('option', {name: 'Ceuta'})).toBeNull();
    expect(screen.queryByRole('option', {name: 'Melilla'})).toBeNull();
    fireEvent.click(screen.getByRole('option', {name: 'Aragón'}));
    expect(screen.getByText('0/5 eventos')).toBeTruthy();
  });
  it('limits selection to five and enables another after removal', async () => {
    show(<BlogDraftList initial={empty} />); await selectEvents();
    expect((screen.getAllByRole('checkbox')[5] as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', {name: candidates[0].name}));
    expect((screen.getAllByRole('checkbox')[5] as HTMLInputElement).disabled).toBe(false);
  });
  it('preserves selected events across search pages and reports failed reads', async () => {
    show(<BlogDraftList initial={empty} />); await selectEvents(1);
    mocks.listEvents.mockRejectedValueOnce(new Error('Network'));
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'Ultra'}});
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(screen.getByText(es.admin.blog.selection.readFailed)).toBeTruthy();
    expect(screen.getByText('1/5 eventos')).toBeTruthy();
  });
  it('preserves selection across pagination and resets the search to page one', async () => {
    mocks.listEvents.mockResolvedValue({events: candidates, pagination: {page: 1, pageSize: 50, total: 51, totalPages: 2}});
    show(<BlogDraftList initial={empty} />); await selectEvents(1);
    fireEvent.click(screen.getByRole('link', {name: '2'}));
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(mocks.listEvents).toHaveBeenLastCalledWith('catalonia','',2,expect.any(AbortSignal));
    expect(screen.getByText('1/5 eventos')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'Cursa'}});
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(mocks.listEvents).toHaveBeenLastCalledWith('catalonia','Cursa',1,expect.any(AbortSignal));
  });
  it('aborts a previous community lookup and ignores its late response', async () => {
    let resolve!: (value: unknown) => void;
    mocks.listEvents.mockReturnValueOnce(new Promise(value => {resolve = value;})).mockResolvedValue({events: [], pagination: {page: 1, pageSize: 50, total: 0, totalPages: 0}});
    show(<BlogDraftList initial={empty} />); await chooseRegion();
    const signal = mocks.listEvents.mock.calls[0][3] as AbortSignal;
    await chooseRegion('Aragón'); expect(signal.aborted).toBe(true);
    await act(async () => resolve({events: candidates, pagination: {page: 1, pageSize: 50, total: 6, totalPages: 1}}));
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText(es.admin.blog.selection.empty)).toBeTruthy();
  });
  it('supports multiple accepted jobs', async () => {
    mocks.generateDraft.mockResolvedValueOnce(pending).mockResolvedValueOnce({ ...pending, id: 'second', instructions: 'Otra guía para elegir carrera' });
    show(<BlogDraftList initial={empty} />); await send(); await send();
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

describe('draft deletion UI', () => {
  const completed:DraftDetail={...pending,status:'completed',title:'Borrador para eliminar',contentHtml:'<p>Artículo disponible.</p>'};
  const completedPage:DraftPage={drafts:[{...completed,score:null}],pagination:{page:1,pageSize:50,total:1,totalPages:1}};
  function open() {
    const menu = screen.queryByRole('button', { name: es.admin.blog.delete.actions });
    if (menu) fireEvent.click(menu);
    fireEvent.click(screen.getByRole('button',{name:es.admin.blog.delete.button}));
  }
  async function confirm() { await act(async()=>fireEvent.click(screen.getByText(es.admin.blog.delete.confirm,{selector:'button'}))); }
  it('opens confirmation without row navigation and permits cancellation',()=>{
    show(<BlogDraftList initial={completedPage} />);open();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(es.admin.blog.delete.cancel,{selector:'button'}));
    expect(screen.queryByRole('dialog')).toBeNull();expect(mocks.deleteDraft).not.toHaveBeenCalled();
  });
  it('retains the row until acceptance, blocks repeated requests and closing, then shows the empty state',async()=>{
    let resolve!:()=>void;mocks.deleteDraft.mockReturnValue(new Promise<void>(r=>{resolve=r;}));mocks.listDrafts.mockResolvedValue(empty);
    show(<BlogDraftList initial={completedPage} />);open();await confirm();
    expect(screen.getByRole('link',{name:completed.title!})).toBeTruthy();
    fireEvent.keyDown(document,{key:'Escape'});expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:es.admin.blog.delete.deleting}));expect(mocks.deleteDraft).toHaveBeenCalledTimes(1);
    await act(async()=>resolve());
    expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByRole('link',{name:completed.title!})).toBeNull();
    expect(screen.getByText(es.admin.blog.empty)).toBeTruthy();
  });
  it('keeps the modal and article after an error and permits retry',async()=>{
    mocks.deleteDraft.mockRejectedValueOnce(new Error('Network')).mockResolvedValueOnce(undefined);
    show(<BlogDraftView initial={completed} />);open();await confirm();
    expect(screen.getByText(es.admin.blog.delete.failed)).toBeTruthy();expect(screen.getByText('Artículo disponible.')).toBeTruthy();
    await confirm();expect(mocks.replace).toHaveBeenCalledWith('/es/admin/blog');expect(mocks.refresh).toHaveBeenCalled();
  });
  it.each([['running','not_evaluated'],['completed','queued'],['completed','running']])('disables active work %s/%s',(status,evaluationStatus)=>{
    const draft={...completed,status,evaluationStatus} as DraftDetail;
    show(<BlogDraftView initial={draft} />);
    fireEvent.click(screen.getByRole('button',{name:es.admin.blog.delete.actions}));
    expect((screen.getByRole('button',{name:es.admin.blog.delete.button}) as HTMLButtonElement).disabled).toBe(true);
  });
  it('refreshes a conflicting evaluation and disables confirmation',async()=>{
    mocks.deleteDraft.mockRejectedValue(new mocks.DraftRequestError(409));mocks.getDraft.mockResolvedValue({...completed,evaluationStatus:'running'});
    show(<BlogDraftView initial={completed} />);open();await confirm();
    expect(screen.getByText(es.admin.blog.delete.processing)).toBeTruthy();
    expect((screen.getByText(es.admin.blog.delete.confirm,{selector:'button'}) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Artículo disponible.')).toBeTruthy();
  });
  it('returns to the list when another admin already deleted the draft',async()=>{
    mocks.deleteDraft.mockRejectedValue(new mocks.DraftRequestError(404));
    show(<BlogDraftView initial={completed} />);open();await confirm();
    expect(mocks.replace).toHaveBeenCalledWith('/es/admin/blog');expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('moves to the last valid page when removing its last row',async()=>{
    mocks.deleteDraft.mockResolvedValue(undefined);
    show(<BlogDraftList initial={{...completedPage,pagination:{page:2,pageSize:50,total:51,totalPages:2}}} />);open();await confirm();
    expect(mocks.replace).toHaveBeenCalledWith('/es/admin/blog');
  });
  it('does not restore a deleted row from an older polling response',async()=>{
    const queued={...pending,id:'other',instructions:'Otro artículo pendiente'};
    let oldRead!:(value:DraftPage)=>void;
    mocks.listDrafts.mockReturnValueOnce(new Promise<DraftPage>(r=>{oldRead=r;})).mockReturnValue(new Promise(()=>{}));
    mocks.deleteDraft.mockResolvedValue(undefined);
    const both:DraftPage={drafts:[{...completed,score:null},{...queued,score:null}],pagination:{page:1,pageSize:50,total:2,totalPages:1}};
    show(<BlogDraftList initial={both} />);
    await act(async()=>vi.advanceTimersByTimeAsync(3000));
    open();await confirm();
    await act(async()=>oldRead(both));
    expect(screen.queryByRole('link',{name:completed.title!})).toBeNull();
    expect(screen.getByRole('link',{name:queued.instructions})).toBeTruthy();
  });
  it('preserves a newly accepted article while deletion is in flight',async()=>{
    let resolve!:()=>void;mocks.deleteDraft.mockReturnValue(new Promise<void>(r=>{resolve=r;}));mocks.generateDraft.mockResolvedValue({...pending,id:'new'});mocks.listDrafts.mockReturnValue(new Promise(()=>{}));
    show(<BlogDraftList initial={completedPage} />);open();await confirm();
    await send();
    await act(async()=>resolve());
    expect(screen.getByRole('link',{name:pending.instructions})).toBeTruthy();
    expect(screen.queryByRole('link',{name:completed.title!})).toBeNull();
  });
});
