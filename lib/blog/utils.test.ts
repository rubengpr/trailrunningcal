import { describe, expect, it } from 'vitest';
import { validateInstructions } from '@/lib/blog/utils';

describe('instruction validation', () => {
  it.each([
    ['', 'tooShort'], ['   ', 'tooShort'], ['a'.repeat(9), 'tooShort'],
    ['a'.repeat(10), null], ['a'.repeat(5_000), null], ['a'.repeat(5_001), 'tooLong'],
    [`  ${'a'.repeat(10)}  `, null], [`  ${'a'.repeat(9)}  `, 'tooShort'],
    [`  ${'a'.repeat(5_000)}  `, null],
  ] as const)('validates trimmed input in case %#', (input, expected) => {
    expect(validateInstructions(input)).toBe(expected);
  });
});
