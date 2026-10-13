import { describe, expect, it } from 'vitest';
import { countCharacters } from './text';

describe('article character count', () => {
  it('counts visible text and decoded entities without HTML markup', () => {
    expect(countCharacters('<p>Hola <strong>trail</strong> &amp; montaña.</p>')).toBe(Array.from('Hola trail & montaña.').length);
  });
  it('preserves inline words and separates block content', () => {
    expect(countCharacters('<h2>Trail</h2><p>run<strong>ning</strong></p><p> España </p>')).toBe('Trail running España'.length);
  });
  it('counts Unicode characters once and normalizes whitespace', () => {
    expect(countCharacters('<p>🏃   hola</p>')).toBe(6);
    expect(countCharacters('<p> </p>')).toBe(0);
  });
});
