// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => ({
    list: 'Solo lista',
    map: 'Solo mapa',
    shortList: 'Lista',
    shortMap: 'Mapa',
  })[key],
}));

import { LayoutToggle } from './layout-toggle';

afterEach(cleanup);

describe('LayoutToggle', () => {
  it('shows short labels only for the icon-and-text variant', () => {
    const onChange = vi.fn();
    render(<LayoutToggle value="both" variant="icon_text" onChange={onChange} />);

    expect(screen.getByText('Lista')).toBeDefined();
    expect(screen.getByText('Mapa')).toBeDefined();

    fireEvent.click(screen.getByTitle('Solo lista'));
    expect(onChange).toHaveBeenCalledWith('map', 'list');
  });

  it('keeps the control variant icon-only', () => {
    render(<LayoutToggle value="both" onChange={vi.fn()} />);

    expect(screen.queryByText('Lista')).toBeNull();
    expect(screen.queryByText('Mapa')).toBeNull();
  });
});
