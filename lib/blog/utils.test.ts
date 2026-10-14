import { describe, expect, it } from 'vitest';
import { canDelete, validateInstructions } from '@/lib/blog/utils';

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

 it.each(['queued','running'] as const)('blocks deletion during research %s',researchStatus => {
   expect(canDelete({status:'completed',evaluationStatus:'completed',researchStatus})).toBe(false);
 });
 it.each(['not_started','completed','partial','failed'] as const)('allows deletion after research %s',researchStatus => {
   expect(canDelete({status:'completed',evaluationStatus:'completed',researchStatus})).toBe(true);
 });
