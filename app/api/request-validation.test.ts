import { describe, expect, it } from 'vitest';
import { parseJsonBody } from './request-validation';

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
