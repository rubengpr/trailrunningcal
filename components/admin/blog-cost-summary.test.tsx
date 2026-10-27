// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { BlogCostSummary } from '@/components/admin/blog-cost-summary';
import es from '@/locales/es/translation.json';
import type { CostSummary } from '@/types/blog-cost.types';

const tokens = {input:59952,cachedInput:5284,cacheWrite30m:28,cacheWrite12h:0,output:2391,reasoning:814};
const costs: CostSummary = {costUsd:0.3144124,partial:true,groups:[
  {stage:'research',costUsd:0.2144124,partial:true,lines:[
    {id:'a',stage:'research',eventName:'Ultra Pirineu',attempt:null,model:'gpt-6.1-sol',status:'succeeded',tokens,searches:7,costUsd:0.2144124},
    {id:'b',stage:'research',eventName:'Cavalls del Vent',attempt:null,model:null,status:null,tokens:null,searches:null,costUsd:null},
  ]},
  {stage:'writing',costUsd:0.1,partial:false,lines:[{id:'w',stage:'writing',eventName:null,attempt:null,model:'gpt-6.1-sol',status:'incomplete',tokens,searches:0,costUsd:0.1}]},
  {stage:'evaluation',costUsd:null,partial:false,lines:[]},
]};
const show = (value: CostSummary | null) => render(<NextIntlClientProvider locale="es" messages={es}><BlogCostSummary costs={value} /></NextIntlClientProvider>);
afterEach(cleanup);

describe('blog cost summary', () => {
  it('starts collapsed with the partial total in the toggle', () => {
    const { container } = show(costs);
    const details = container.querySelector('details')!;
    expect(details.open).toBe(false);
    expect(screen.getByText('Costes · $0.3144 (parcial)')).toBeTruthy();
    fireEvent.click(container.querySelector('summary')!);
    expect(details.open).toBe(true);
  });
  it('lists every call with its tokens, searches and unknown costs', () => {
    show(costs);
    const rows = screen.getAllByRole('row');
    const pirineu = rows.find(row => row.textContent?.includes('Ultra Pirineu'))!;
    expect(within(pirineu).getByText('59.952')).toBeTruthy();
    expect(within(pirineu).getByText('7')).toBeTruthy();
    expect(within(pirineu).getByText('$0.21')).toBeTruthy();
    const unknown = rows.find(row => row.textContent?.includes('Cavalls del Vent'))!;
    expect(within(unknown).getByText('Coste no disponible')).toBeTruthy();
    expect(screen.getByText('Incompleta')).toBeTruthy();
    expect(screen.getByText('Sin llamadas')).toBeTruthy();
  });
  it('keeps wide tables reachable from the keyboard', () => {
    const { container } = show(costs);
    expect(container.querySelector('summary')).toBeTruthy();
    container.querySelectorAll('table').forEach(table => expect(table.parentElement?.tabIndex).toBe(0));
  });
  it('shows unknown totals without converting them to zero', () => {
    show({costUsd:null,partial:true,groups:[{stage:'writing',costUsd:null,partial:true,lines:[{id:'w',stage:'writing',eventName:null,attempt:null,model:null,status:null,tokens:null,searches:null,costUsd:null}]}]});
    expect(screen.getByText('Costes · Coste no disponible')).toBeTruthy();
    expect(screen.queryByText('$0')).toBeNull();
  });
  it('reports a failed read with the shared error UI', () => {
    show(null);
    expect(screen.getByText('No se han podido cargar los costes.')).toBeTruthy();
  });
});
