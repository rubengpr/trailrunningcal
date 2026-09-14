import { describe, expect, it } from 'vitest';
import { EVENT_IMPORT_MAX_BATCH_SIZE } from '@/lib/event-import/config';
import { parseBatchInput } from './validation';

const model = 'openai/gpt-5.4-mini';

describe('parseBatchInput', () => {
  it('accepts the maximum number of URLs', () => {
    const urls = Array.from(
      { length: EVENT_IMPORT_MAX_BATCH_SIZE },
      (_, index) => `https://example.com/events/${index}`,
    );

    expect(parseBatchInput({ urls, model }).urls).toHaveLength(
      EVENT_IMPORT_MAX_BATCH_SIZE,
    );
  });

  it('rejects requests over the maximum before parsing URLs', () => {
    const urls = Array.from(
      { length: EVENT_IMPORT_MAX_BATCH_SIZE + 1 },
      (_, index) => `https://example.com/events/${index}`,
    );

    expect(() => parseBatchInput({ urls, model })).toThrow(
      `Too many URLs (max ${EVENT_IMPORT_MAX_BATCH_SIZE})`,
    );
  });
});
