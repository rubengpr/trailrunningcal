// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NumberInput } from './number-input';

describe('NumberInput', () => {
  it('removes focus on wheel so browsers do not step the value', () => {
    render(<NumberInput aria-label="Distance" defaultValue="17.3" />);

    const input = screen.getByLabelText('Distance') as HTMLInputElement;
    input.focus();

    expect(document.activeElement).toBe(input);

    fireEvent.wheel(input, { deltaY: 100 });

    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe('17.3');
  });

  it('preserves consumer wheel handlers', () => {
    const onWheel = vi.fn();
    render(<NumberInput aria-label="Elevation" onWheel={onWheel} />);

    fireEvent.wheel(screen.getByLabelText('Elevation'));

    expect(onWheel).toHaveBeenCalledOnce();
  });
});
