import { describe, expect, it } from 'vitest';
import { EVENT_DESCRIPTION_MAX_BATCH_SIZE } from '@/lib/event-description/config';
import { parseBatchInput } from './validation';

function uuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;
}

describe('parseBatchInput', () => {
  it('accepts the maximum number of events', () => {
    const eventIds = Array.from(
      { length: EVENT_DESCRIPTION_MAX_BATCH_SIZE },
      (_, index) => uuid(index),
    );

    expect(parseBatchInput({ eventIds }).eventIds).toHaveLength(
      EVENT_DESCRIPTION_MAX_BATCH_SIZE,
    );
  });

  it('rejects requests over the maximum before parsing event IDs', () => {
    const eventIds = Array.from(
      { length: EVENT_DESCRIPTION_MAX_BATCH_SIZE + 1 },
      (_, index) => uuid(index),
    );

    expect(() => parseBatchInput({ eventIds })).toThrow(
      `Too many events (max ${EVENT_DESCRIPTION_MAX_BATCH_SIZE})`,
    );
  });
});
