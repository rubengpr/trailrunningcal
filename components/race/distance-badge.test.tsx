// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Locale } from '@/i18n';
import { DistanceBadge } from './distance-badge';

afterEach(cleanup);

describe('DistanceBadge', () => {
  it.each([
    [5, '0-10', 'bg-[#EFF8F3]'],
    [15, '10-20', 'bg-[#D8EEE3]'],
    [21, '20-30', 'bg-[#B8DCCD]'],
    [35, '30-40', 'bg-[#87B9A4]'],
    [42, '40-50', 'bg-[#477B64]'],
    [50, '50+', 'bg-[#224D3C]'],
  ] as const)(
    'uses the expected palette for %s km',
    (distanceKm, group, colorClass) => {
      render(<DistanceBadge distanceKm={distanceKm} locale="es" />);

      const badge = screen.getByText(String(distanceKm)).closest('[data-distance-group]');
      expect(badge?.getAttribute('data-distance-group')).toBe(group);
      expect(badge?.classList.contains(colorClass)).toBe(true);
      expect(screen.getByText('km')).toBeDefined();
    },
  );

  it.each(['es', 'ca', 'en', 'fr'] as const)(
    'rounds distances to whole kilometers for the %s locale',
    (locale: Locale) => {
      const { rerender } = render(<DistanceBadge distanceKm={21.5} locale={locale} />);

      expect(screen.getByText('22')).toBeDefined();
      expect(screen.getByText('km')).toBeDefined();

      rerender(<DistanceBadge distanceKm={21.4} locale={locale} />);

      expect(screen.getByText('21')).toBeDefined();
    },
  );

  it('supports small and medium sizes', () => {
    const { rerender } = render(
      <DistanceBadge distanceKm={21} locale="es" size="sm" />,
    );

    let badge = screen.getByText('21').closest('[data-distance-group]');
    expect(badge?.classList.contains('text-[10px]')).toBe(true);

    rerender(<DistanceBadge distanceKm={21} locale="es" size="md" />);

    badge = screen.getByText('21').closest('[data-distance-group]');
    expect(badge?.classList.contains('text-xs')).toBe(true);
  });
});
