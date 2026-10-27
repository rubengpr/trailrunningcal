import { describe, expect, it } from 'vitest';
import { countLength, describeRange, measureLength } from '@/lib/blog/length-targets';

describe('length targets', () => {
  it('counts trimmed code points and slug or text words', () => {
    expect(countLength('  Andalucía  ', 'characters')).toBe(9);
    expect(countLength('trail-running-andalucia', 'words')).toBe(3);
    expect(countLength('trail running en Andalucía', 'words')).toBe(4);
  });

  it('measures every target of a field', () => {
    expect(measureLength('slug', 'trail-running')).toEqual([
      { unit: 'words', min: 3, max: 8, count: 2, inRange: false, status: 'outside' },
      { unit: 'characters', min: 1, max: 74, count: 13, inRange: true, status: 'within' },
    ]);
  });

  it.each([[125, 'outside'], [126, 'near'], [139, 'near'], [140, 'within'], [160, 'within'], [161, 'near'], [176, 'near'], [177, 'outside']])('classifies a description with %i characters as %s', (count, status) => {
    expect(measureLength('metaDescription', 'a'.repeat(Number(count)))[0].status).toBe(status);
  });

  it('describes ranges for prompts', () => {
    expect(describeRange('seoTitle', 'characters')).toBe('45–60 caracteres');
  });
});
