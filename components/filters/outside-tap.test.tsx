// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import Link from 'next/link';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilterBar } from '@/components/filters/filter-bar';
import es from '@/locales/es/translation.json';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(variant: 'pill' | 'control', touch = true) {
  vi.stubGlobal('matchMedia', () => ({ matches: touch }));
  const navigate = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <FilterBar
        variant={variant}
        selectedMonth={[]} selectedProvince={[]} selectedDistance={[]} selectedRaceType={[]}
        onMonthSelect={() => {}} onProvinceSelect={() => {}}
        onDistanceSelect={() => {}} onRaceTypeSelect={() => {}} onClearFilters={() => {}}
      />
      <Link href="/es/e/test" prefetch={false} onClick={(event) => { event.preventDefault(); navigate(); }}>Event card</Link>
    </NextIntlClientProvider>,
  );
  return { navigate, card: screen.getByRole('link', { name: 'Event card' }) };
}

function menu() {
  return document.querySelector('.animate-filter-select-in');
}

describe.each(['pill', 'control'] as const)('%s filter outside taps', (variant) => {
  it.each([
    es.filters.monthLabel,
    es.filters.provinceLabel,
    es.filters.distanceLabel,
    es.filters.raceTypeLabel,
  ])('only closes %s on the first outside touch', (label) => {
    const { card, navigate } = setup(variant);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(menu()).not.toBeNull();

    fireEvent.mouseDown(card);
    expect(menu()).not.toBeNull();
    fireEvent.click(card);
    expect(menu()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.mouseDown(card);
    fireEvent.click(card);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('preserves desktop outside clicks', () => {
    const { card, navigate } = setup(variant, false);
    fireEvent.click(screen.getByRole('button', { name: es.filters.monthLabel }));
    fireEvent.mouseDown(card);
    expect(menu()).toBeNull();
    fireEvent.click(card);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('consumes a touch on another filter before allowing it to open', () => {
    setup(variant);
    fireEvent.click(screen.getByRole('button', { name: es.filters.monthLabel }));
    const province = screen.getByRole('button', { name: es.filters.provinceLabel });
    fireEvent.mouseDown(province);
    fireEvent.click(province);
    expect(menu()).toBeNull();
    fireEvent.click(province);
    expect(screen.getByRole('checkbox', { name: 'Barcelona' })).toBeDefined();
  });
});
