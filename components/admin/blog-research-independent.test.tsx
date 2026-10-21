// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BlogProvider } from '@/components/admin/blog-provider';
import { BlogResearchWorkspace } from '@/components/admin/blog-research-workspace';
import { BlogResearchView } from '@/components/admin/blog-research-view';
import { context } from '@/tests/fixtures/blog-selection';
import { run, dossier } from '@/tests/fixtures/blog-research';
import type { ResearchRun, ResearchPage } from '@/types/blog-research.types';
import es from '@/locales/es/translation.json';
const mocks = vi.hoisted(() => ({requestResearch:vi.fn(),listResearch:vi.fn(),getResearch:vi.fn(),listEvents:vi.fn(),generateDraft:vi.fn(),replace:vi.fn(),push:vi.fn()}));
vi.mock('@/lib/api/blog-research',() => mocks);
vi.mock('@/lib/api/blog-drafts',() => mocks);
vi.mock('next/navigation',() => ({useRouter:() => ({replace:mocks.replace,push:mocks.push})}));
const empty: ResearchPage = {runs:[],pagination:{page:1,pageSize:50,total:0,totalPages:0}};
const accepted:ResearchRun = {...run,draftId:null,regionId:context.regionId,regionName:context.regionName};
function show(initial = empty) {
  return render(<NextIntlClientProvider locale="es" messages={es}><BlogProvider><BlogResearchWorkspace initial={initial} /></BlogProvider></NextIntlClientProvider>);
}
async function select() {
  fireEvent.click(screen.getByRole('combobox'));fireEvent.click(screen.getByRole('option',{name:'Cataluña'}));
  await act(async() => vi.advanceTimersByTimeAsync(300));
  screen.getAllByRole('checkbox').forEach(box => fireEvent.click(box));
}
beforeEach(() => {
  vi.useFakeTimers();vi.resetAllMocks();mocks.listEvents.mockResolvedValue({events:context.events,pagination:{page:1,pageSize:50,total:5,totalPages:1}});
  mocks.listResearch.mockResolvedValue(empty);
});
afterEach(() => {cleanup();vi.useRealTimers();});
it('validates five events before requesting independent research',async() => {
  show();await act(async() => fireEvent.click(screen.getByRole('button',{name:es.admin.blog.research.start})));
  expect(mocks.requestResearch).not.toHaveBeenCalled();expect(screen.getByText(es.admin.blog.selection.required)).toBeTruthy();
});
it('accepts once, clears selection only after acceptance and stays in the history',async() => {
  let resolve!:(run:ResearchRun)=>void;mocks.requestResearch.mockReturnValue(new Promise<ResearchRun>(r=>{resolve=r;}));
  show();await select();
  await act(async() => fireEvent.click(screen.getByRole('button',{name:es.admin.blog.research.start})));
  expect(screen.getAllByRole('checkbox').every(box => (box as HTMLInputElement).checked)).toBe(true);
  expect(mocks.requestResearch).toHaveBeenCalledTimes(1);expect(mocks.generateDraft).not.toHaveBeenCalled();
  await act(async() => resolve(accepted));
  expect(screen.getAllByRole('checkbox').every(box => !(box as HTMLInputElement).checked)).toBe(true);
  expect(screen.getByRole('combobox').textContent).toContain('Cataluña');
  expect(screen.getByRole('link',{name:/Evento 0/}).getAttribute('href')).toBe(`/es/admin/blog/research/${run.id}`);
  expect(mocks.push).not.toHaveBeenCalled();expect(mocks.replace).not.toHaveBeenCalled();
  expect(screen.getByText(es.admin.blog.research.accepted)).toBeTruthy();
});
it('preserves selection on rejection and supports resubmission',async() => {
  mocks.requestResearch.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(accepted);
  show();await select();await act(async() => fireEvent.click(screen.getByRole('button',{name:es.admin.blog.research.start})));
  expect(screen.getByText(es.admin.blog.research.requestFailed)).toBeTruthy();
  expect(screen.getAllByRole('checkbox').every(box => (box as HTMLInputElement).checked)).toBe(true);
  await act(async() => fireEvent.click(screen.getByRole('button',{name:es.admin.blog.research.start})));
  expect(mocks.requestResearch).toHaveBeenCalledTimes(2);
});
it('polls a standalone detail and keeps dossiers on a subsequent read error and reload',async() => {
  const completed:ResearchRun = {...accepted,status:'completed',results:accepted.results.map(result => ({...result,status:'completed',dossier}))};
  mocks.getResearch.mockResolvedValueOnce(completed).mockRejectedValueOnce(new Error('network'));
  const renderDetail = (value:ResearchRun) => <NextIntlClientProvider locale="es" messages={es}><BlogResearchView initial={value} /></NextIntlClientProvider>;
  const view = render(renderDetail(accepted));
  await act(async() => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getAllByText(/El evento sucede en Bagà/)).toHaveLength(2);
  await act(async() => window.dispatchEvent(new Event('focus')));
  expect(screen.getByText(es.admin.blog.research.readFailed)).toBeTruthy();expect(screen.getAllByText(/El evento sucede en Bagà/)).toHaveLength(2);
  view.unmount();render(renderDetail(completed));expect(screen.getAllByText(/El evento sucede en Bagà/)).toHaveLength(2);
});
