// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BlogDraftResearch } from '@/components/admin/blog-draft-research';
import { context } from '@/tests/fixtures/blog-selection';
import { dossier, run } from '@/tests/fixtures/blog-research';
import es from '@/locales/es/translation.json';
const mocks = vi.hoisted(() => ({listResearch:vi.fn(),researchDraft:vi.fn(),DraftRequestError:class extends Error {constructor(public status:number){super('Request');}}}));
vi.mock('@/lib/api/blog-drafts',() => mocks);
const empty = {runs:[],pagination:{page:1,pageSize:50,total:0,totalPages:0}};
function show(initial = empty as {runs:typeof run[];pagination:typeof empty.pagination}, status: 'not_started'|'running'='not_started') {
  const onStatusChange=vi.fn();
  const view=render(<NextIntlClientProvider locale="es" timeZone="Europe/Paris" messages={es}><BlogDraftResearch id={run.draftId} context={context} initial={initial} status={status} onStatusChange={onStatusChange} /></NextIntlClientProvider>);
  return {...view,onStatusChange};
}
beforeEach(() => {vi.useFakeTimers();vi.resetAllMocks();mocks.listResearch.mockResolvedValue(empty);});
afterEach(() => {cleanup();vi.useRealTimers();});
it('selects only two events, blocks duplicate submits, and displays acceptance without navigation',async() => {
  let resolve!:(value:typeof run)=>void;mocks.researchDraft.mockReturnValue(new Promise(r => {resolve=r;}));
  show();fireEvent.click(screen.getByText('Investigación'));
  const boxes=screen.getAllByRole('checkbox');boxes.slice(2).forEach(box => fireEvent.click(box));
  await act(async() => fireEvent.click(screen.getByRole('button',{name:'Investigar eventos'})));
  expect(mocks.researchDraft).toHaveBeenCalledWith(run.draftId,context.events.slice(0,2).map(item => item.id));
  expect((screen.getByRole('button',{name:'Enviando…'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Enviando…'}));expect(mocks.researchDraft).toHaveBeenCalledTimes(1);
  mocks.listResearch.mockResolvedValue({runs:[run],pagination:{...empty.pagination,total:1,totalPages:1}});
  await act(async() => resolve(run));expect(screen.getByText(/0\/2 eventos investigados/)).toBeTruthy();
});
it('rejects empty selection and preserves selection after request failure',async() => {
  show();fireEvent.click(screen.getByText('Investigación'));screen.getAllByRole('checkbox').forEach(box => fireEvent.click(box));
  await act(async() => fireEvent.click(screen.getByRole('button',{name:'Investigar eventos'})));
  expect(screen.getByText(es.admin.blog.research.selectionRequired)).toBeTruthy();expect(mocks.researchDraft).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole('checkbox')[0]);mocks.researchDraft.mockRejectedValue(new Error('network'));
  await act(async() => fireEvent.click(screen.getByRole('button',{name:'Investigar eventos'})));
  expect(screen.getByText(es.admin.blog.research.requestFailed)).toBeTruthy();expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(true);
});
it('polls partial results, preserves them on read errors and renders clickable citations safely',async() => {
  const pendingPage={runs:[{...run,status:'running' as const}],pagination:{...empty.pagination,total:1,totalPages:1}};
  mocks.listResearch.mockResolvedValue(pendingPage);const view=show(pendingPage,'running');fireEvent.click(screen.getByText('Investigación'));
  const partial={...run,status:'partial' as const,results:run.results.map((result,index) => ({...result,status:index===0?'completed' as const:'failed' as const,dossier:index===0?dossier:null}))};
  mocks.listResearch.mockResolvedValue({runs:[partial],pagination:pendingPage.pagination});
  await act(async() => vi.advanceTimersByTimeAsync(3000));expect(view.onStatusChange).toHaveBeenCalledWith('partial');
  fireEvent.click(screen.getByText('Evento 0 · Completada'));expect(screen.getByRole('link',{name:'[1]'}).getAttribute('href')).toBe(dossier.sources[0].url);
  mocks.listResearch.mockRejectedValue(new Error('network'));await act(async() => window.dispatchEvent(new Event('focus')));
  expect(screen.getByText(es.admin.blog.research.readFailed)).toBeTruthy();expect(screen.getByRole('link',{name:'[1]'})).toBeTruthy();
});
it('loads older history pages and keeps reports available after remount',async() => {
  const completed={...run,status:'completed' as const,results:run.results.map(result => ({...result,status:'completed' as const,dossier}))};
  const history={runs:[completed],pagination:{page:1,pageSize:50,total:51,totalPages:2}};
  mocks.listResearch.mockResolvedValue(history);show(history);fireEvent.click(screen.getByText('Investigación'));
  mocks.listResearch.mockResolvedValue({...history,pagination:{...history.pagination,page:2}});
  await act(async() => fireEvent.click(screen.getByRole('link',{name:'2'})));
  expect(mocks.listResearch).toHaveBeenCalledWith(run.draftId,2,expect.any(AbortSignal));
});
