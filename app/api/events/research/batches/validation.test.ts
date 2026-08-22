import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/lib/errors';
import { parseResearchBatchInput } from './validation';

describe('parseResearchBatchInput', () => {
  it('trims and deduplicates names case-insensitively', () => {
    expect(
      parseResearchBatchInput({
        eventNames: [' XIV Solana Trail ', 'xiv solana trail', 'Trail Navajas'],
      }),
    ).toEqual({ eventNames: ['XIV Solana Trail', 'Trail Navajas'] });
  });

  it('rejects invalid names and more than 50 unique names', () => {
    expect(() => parseResearchBatchInput({ eventNames: ['x'] })).toThrow(
      ValidationError,
    );
    expect(() =>
      parseResearchBatchInput({
        eventNames: Array.from({ length: 51 }, (_, index) => `Event ${index}`),
      }),
    ).toThrow('Invalid number of event names');
  });
});
