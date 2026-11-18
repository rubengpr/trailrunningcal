import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), ask: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.auth }));
vi.mock('@/lib/services/weather-assistant', () => ({ askWeather: mocks.ask }));
import { AuthError, ForbiddenError } from '@/lib/errors';
import { POST } from './route';

const request = (body: unknown) => new Request('http://localhost/api/weather-assistant', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(undefined);
});

describe('weather assistant access and input', () => {
  it.each([[new AuthError(), 401], [new ForbiddenError(), 403]])('denies unauthorized access before using the agent', async (error, status) => {
    mocks.auth.mockRejectedValue(error);
    const response = await POST(request({ question: 'Berga', locale: 'es' }));
    expect(response.status).toBe(status);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.ask).not.toHaveBeenCalled();
  });

  it.each([null, {}, { question: ' ', locale: 'es' }, { question: 'x'.repeat(2001), locale: 'es' }, { question: 'Berga', locale: 'xx' }])('rejects invalid input before external calls', async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.ask).not.toHaveBeenCalled();
  });

  it('handles malformed JSON', async () => {
    const response = await POST(new Request('http://localhost/api/weather-assistant', { method: 'POST', body: '{' }));
    expect(response.status).toBe(400);
    expect(mocks.ask).not.toHaveBeenCalled();
  });

  it('returns the agent answer with the project API contract', async () => {
    mocks.ask.mockResolvedValue({ answer: 'Hace 18 °C.', usedWeather: true });
    const response = await POST(request({ question: ' Berga ', locale: 'es', previous_response_id: 'untrusted' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { answer: 'Hace 18 °C.', usedWeather: true } });
    expect(mocks.ask).toHaveBeenCalledWith({ question: 'Berga', locale: 'es' }, expect.any(AbortSignal));
  });
});
