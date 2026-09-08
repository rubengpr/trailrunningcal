import { describe, expect, it } from 'vitest';
import { parseJsonBody, parseUuidParam } from './request-validation';

describe('parseJsonBody', () => {
  it('returns parsed JSON', async () => {
    const request = new Request('https://example.com', {
      body: JSON.stringify({ event: 'Trail Running Cal' }),
      method: 'POST',
    });

    await expect(parseJsonBody(request)).resolves.toEqual({
      event: 'Trail Running Cal',
    });
  });

  it('returns a validation error for malformed JSON', async () => {
    const request = new Request('https://example.com', {
      body: '{',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    await expect(parseJsonBody(request)).rejects.toMatchObject({
      message: 'Invalid request body',
      status: 400,
    });
  });
});

describe('parseUuidParam', () => {
  it('accepts a UUID', () => {
    expect(parseUuidParam('5cd34b8e-8803-4b2d-bbae-8c7ba2a0a9ba', 'event id'))
      .toBe('5cd34b8e-8803-4b2d-bbae-8c7ba2a0a9ba');
  });

  it('returns a validation error for an invalid UUID', () => {
    expect(() => parseUuidParam('not-a-uuid', 'event id')).toThrowError(
      'Invalid event id',
    );
  });
});
