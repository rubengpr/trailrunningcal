// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import es from '@/locales/es/translation.json';
import { parseLocationFilters } from '@/lib/geography/filters';
import { AdminEventsFilters } from './admin-events-filters';
import type { RegionId } from '@/lib/geography/destinations';

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

function setup(regions: RegionId[] = [], provinces: string[] = [], options: { query?: string; draftId?: string } = {}) {
  function Harness() {
    const [selected, setSelected] = useState({ regions, provinces });
    mocks.replace.mockImplementation((href: string) => {
      const params = new URL(href, 'http://localhost').searchParams;
      setSelected(parseLocationFilters(params.getAll('region'), params.getAll('province')));
    });
    return <NextIntlClientProvider locale="es" messages={es}>
      <AdminEventsFilters action="/es/admin/eventos/borradores" inputId="search" initialQuery={options.query ?? 'trail'}
        initialRegions={selected.regions} initialProvinces={selected.provinces}
        hiddenFields={{ sort: 'name', direction: 'desc', draftId: options.draftId }} />
    </NextIntlClientProvider>;
  }
  render(<Harness />);
}

function params() { return new URL(mocks.replace.mock.lastCall![0], 'http://localhost').searchParams; }

describe('admin location filters applied on close', () => {
  it('applies multiple communities once when closing the menu', () => {
    setup();
    fireEvent.click(screen.getByLabelText('Comunidad Autónoma'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Galicia' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cataluña' }));
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: 'Galicia' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByLabelText('Comunidad Autónoma'));
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(params().getAll('region')).toEqual(['galicia', 'catalonia']);
    expect(params().get('q')).toBe('trail');
    expect(params().get('sort')).toBe('name');
    expect(params().get('page')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: 'Galicia' })).toBeNull();
  });

  it('applies multiple provinces once when clicking outside', () => {
    setup(['galicia', 'catalonia']);
    fireEvent.click(screen.getByLabelText('Provincia'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Lugo' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Barcelona' }));
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole('checkbox', { name: 'Madrid' })).toBeNull();
    fireEvent.mouseDown(document.body);
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(params().getAll('province')).toEqual(['Lugo', 'Barcelona']);
    expect(screen.queryByRole('checkbox', { name: 'Madrid' })).toBeNull();
    expect(within(screen.getByLabelText('Provincia')).getByText('Lugo +1')).toBeTruthy();
  });

  it('clears incompatible provinces and retains provinces when clearing all communities', () => {
    setup(['galicia', 'catalonia'], ['Lugo', 'Barcelona']);
    fireEvent.click(screen.getByLabelText('Comunidad Autónoma'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cataluña' }));
    fireEvent.click(screen.getByLabelText('Comunidad Autónoma'));
    expect(params().getAll('province')).toEqual(['Lugo']);
    fireEvent.click(screen.getByLabelText('Comunidad Autónoma'));
    fireEvent.click(screen.getByRole('button', { name: 'Todas las comunidades autónomas' }));
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mocks.replace).toHaveBeenCalledTimes(2);
    expect(params().getAll('region')).toEqual([]);
    fireEvent.click(screen.getByLabelText('Comunidad Autónoma'));
    expect(params().getAll('province')).toEqual(['Lugo']);
    fireEvent.click(screen.getByLabelText('Comunidad Autónoma'));
  });
  it('does not navigate when closing an unchanged selection', () => {
    setup(['galicia']);
    fireEvent.click(screen.getByLabelText('Comunidad Autónoma'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cataluña' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cataluña' }));
    fireEvent.click(screen.getByLabelText('Comunidad Autónoma'));
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('clears all filters in one navigation and discards an open menu draft', () => {
    setup(['galicia'], ['Lugo'], { draftId: 'target-draft' });
    fireEvent.click(screen.getByLabelText('Comunidad Autónoma'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cataluña' }));
    expect(mocks.replace).not.toHaveBeenCalled();
    const clear = screen.getByRole('button', { name: 'Limpiar filtros' });
    fireEvent.mouseDown(clear);
    fireEvent.click(clear);
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(params().getAll('region')).toEqual([]);
    expect(params().getAll('province')).toEqual([]);
    expect(params().has('q')).toBe(false);
    expect(params().has('draftId')).toBe(false);
    expect(params().get('sort')).toBe('name');
    expect(params().get('direction')).toBe('desc');
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('checkbox', { name: 'Cataluña' })).toBeNull();
  });

  it('hides the clear button when filters are already clear', () => {
    setup([], [], { query: '' });
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('shows the clear button for a province filter without a search query', () => {
    setup([], ['Lugo'], { query: '' });
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeTruthy();
  });

});
