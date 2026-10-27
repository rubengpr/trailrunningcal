// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { FilterBar } from '@/components/filters/filter-bar';
import { ProvinceFilter } from '@/components/filters/province-filter';
import es from '@/locales/es/translation.json';
import { GEOGRAPHY, getLocalizedProvinceGroups } from '@/lib/geography/destinations';

const groups = getLocalizedProvinceGroups({ locale: 'es', getRegionLabel: (id) => id, getProvinceLabel: (id) => id });
const catalonia = groups.find((group) => group.provinceIds.includes('barcelona'))!;
const provinces = catalonia.provinceIds.map((id) => GEOGRAPHY.provinces[id].dbName);
const regionLabel = es.geography.regions[catalonia.regionId];

afterEach(cleanup);

function Harness({ variant }: { variant: 'control' | 'pill' | 'mobile' }) {
  const [selected, setSelected] = useState(['Madrid', provinces[0]]);
  return <NextIntlClientProvider locale="es" messages={es}>
    {variant === 'mobile' ? <ProvinceFilter selectedProvince={selected} onProvinceSelect={setSelected} /> :
      <FilterBar variant={variant} selectedProvince={selected} onProvinceSelect={setSelected}
        selectedMonth={[]} selectedDistance={[]} selectedRaceType={[]}
        onMonthSelect={() => {}} onDistanceSelect={() => {}} onRaceTypeSelect={() => {}} onClearFilters={() => {}} />}
    <output data-testid="selection">{JSON.stringify(selected)}</output>
  </NextIntlClientProvider>;
}

function selection(): string[] {
  return JSON.parse(screen.getByTestId('selection').textContent!);
}

describe('province region selection', () => {
  it.each(['pill', 'control', 'mobile'] as const)('%s selects all provinces, preserves other regions, and clears a full region', (variant) => {
    render(<Harness variant={variant} />);
    if (variant !== 'mobile') fireEvent.click(screen.getByRole('button', { name: variant === 'control' ? 'Madrid +1' : /Provincia/ }));
    const region = screen.getByRole('checkbox', { name: regionLabel });
    expect(region.getAttribute('aria-checked')).toBe('mixed');
    fireEvent.click(region);
    expect(selection().sort()).toEqual(['Madrid', ...provinces].sort());
    expect(region.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(region);
    expect(selection()).toEqual(['Madrid']);
    expect(region.getAttribute('aria-checked')).toBe('false');
  });

  it('searches by region and toggles the entire region when only one province matches', () => {
    render(<Harness variant="pill" />);
    fireEvent.click(screen.getByRole('button', { name: /Provincia/ }));
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: regionLabel } });
    for (const id of catalonia.provinceIds) {
      expect(screen.getByRole('checkbox', { name: es.provincia.names[id] })).toBeTruthy();
    }
    fireEvent.change(search, { target: { value: es.provincia.names[catalonia.provinceIds[0]] } });
    fireEvent.click(screen.getByRole('checkbox', { name: regionLabel }));
    expect(selection().sort()).toEqual(['Madrid', ...provinces].sort());
    fireEvent.change(search, { target: { value: '' } });
    fireEvent.click(screen.getByRole('checkbox', { name: es.provincia.names[catalonia.provinceIds[0]] }));
    expect(screen.getByRole('checkbox', { name: regionLabel }).getAttribute('aria-checked')).toBe('mixed');
  });
});
