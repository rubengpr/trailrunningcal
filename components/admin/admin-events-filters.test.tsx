// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import es from '@/locales/es/translation.json';
import { AdminEventsFilters } from './admin-events-filters';
import type { RegionId } from '@/lib/geography/destinations';

vi.mock('@/components/ui/select-menu', () => ({
  SelectMenu: ({ id, label, value, options, placeholder, onValueChange }: {
    id: string; label: string; value: string;
    options: Array<{ value: string; label: string }>;
    placeholder: string; onValueChange: (value: string) => void;
  }) => <label>{label}<select id={id} value={value} onChange={(event) => onValueChange(event.target.value)}>
    <option value="">{placeholder}</option>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select></label>,
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setup(region?: RegionId, province?: string) {
  const submitted: FormData[] = [];
  vi.spyOn(HTMLFormElement.prototype, 'requestSubmit').mockImplementation(function (this: HTMLFormElement) {
    submitted.push(new FormData(this));
  });
  render(<NextIntlClientProvider locale="es" messages={es}>
    <AdminEventsFilters action="/es/admin/eventos/borradores" inputId="search" initialQuery="trail"
      initialRegion={region} initialProvince={province} hiddenFields={{ sort: 'name', direction: 'desc' }} />
  </NextIntlClientProvider>);
  return {
    region: screen.getByLabelText('Comunidad Autónoma'),
    province: screen.getByLabelText('Provincia'), submitted,
  };
}

describe('dependent admin location filters', () => {
  it('only lists the selected region provinces', () => {
    const { province } = setup('galicia');
    expect(within(province).getAllByRole('option').map((option) => option.textContent))
      .toEqual(['Todas las provincias', 'A Coruña', 'Lugo', 'Ourense', 'Pontevedra']);
  });

  it('clears an incompatible province before submitting and preserves other filters', () => {
    const { region, province, submitted } = setup('galicia', 'Lugo');
    fireEvent.change(region, { target: { value: 'catalonia' } });
    expect((province as HTMLSelectElement).value).toBe('');
    expect(Object.fromEntries(submitted[0])).toEqual({ region: 'catalonia', province: '', q: 'trail', sort: 'name', direction: 'desc' });
    expect(within(province).queryByText('Lugo')).toBeNull();
    expect(within(province).getByText('Barcelona')).toBeTruthy();
  });

  it('retains the province when removing the region and restores all options', () => {
    const { region, province, submitted } = setup('galicia', 'Lugo');
    fireEvent.change(region, { target: { value: '' } });
    expect(submitted[0].get('province')).toBe('Lugo');
    expect(submitted[0].get('region')).toBe('');
    expect(within(province).getAllByRole('option').length).toBeGreaterThan(50);
  });
});
