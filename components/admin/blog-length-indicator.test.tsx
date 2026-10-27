// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { BlogLengthIndicator } from '@/components/admin/blog-length-indicator';
import es from '@/locales/es/translation.json';
import type { LengthField } from '@/lib/blog/length-targets';

const show = (field: LengthField, value: string) => render(<NextIntlClientProvider locale="es" messages={es}><BlogLengthIndicator field={field} value={value} /></NextIntlClientProvider>);
afterEach(cleanup);

describe('blog length indicator', () => {
  it('shows a check and the count when the value is in range', () => {
    const { container } = show('seoTitle', 'Trail running en Andalucía: cinco eventos para elegir');
    expect(container.querySelector('svg')).toBeTruthy();
    fireEvent.mouseEnter(container.firstElementChild!);
    expect(screen.getByText('53 caracteres. Dentro del rango 45–60')).toBeTruthy();
  });

  it('shows the count and the correct range when the value is out of range', () => {
    const { container } = show('seoTitle', 'Trail en Andalucía');
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('18')).toBeTruthy();
    fireEvent.mouseEnter(container.firstElementChild!);
    expect(screen.getByText('18 caracteres. Rango correcto: 45–60')).toBeTruthy();
  });

  it('lists only the failing slug targets', () => {
    const { container } = show('slug', 'trail-andalucia');
    fireEvent.mouseEnter(container.firstElementChild!);
    expect(screen.getByText('2 palabras. Rango correcto: 3–8')).toBeTruthy();
  });

  it('shows a minor deviation in amber instead of red', () => {
    const { container } = show('metaDescription', 'a'.repeat(161));
    expect(screen.getByText('161').className).toContain('text-amber-700');
    fireEvent.mouseEnter(container.firstElementChild!);
    expect(screen.getByText('161 caracteres. Levemente fuera del rango 140–160, dentro del margen del 10 %')).toBeTruthy();
  });
});
