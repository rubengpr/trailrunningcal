import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentWeather } from '@/lib/integrations/open-meteo/client';

afterEach(() => vi.unstubAllGlobals());
const signal = () => new AbortController().signal;
const place = { name: 'Berga', admin1: 'Cataluña', country: 'España', latitude: 42.1, longitude: 1.85 };
const current = { time: '2026-11-18T12:00', temperature_2m: 18, apparent_temperature: 17,
  relative_humidity_2m: 60, precipitation: 0, wind_speed_10m: 8, weather_code: 1 };

describe('current weather integration', () => {
  it('geocodes and returns explicit units, resolved location and local time', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ results: [place] }))
      .mockResolvedValueOnce(Response.json({ timezone: 'Europe/Madrid', current }));
    vi.stubGlobal('fetch', fetch);
    await expect(getCurrentWeather('Berga', signal())).resolves.toMatchObject({
      location: 'Berga, Cataluña, España', time: current.time, timezone: 'Europe/Madrid',
      temperatureC: 18, apparentTemperatureC: 17, windSpeedKmh: 8, precipitationMm: 0,
    });
    expect(fetch.mock.calls[0][0].searchParams.get('name')).toBe('Berga');
    expect(fetch.mock.calls[1][0].searchParams.get('latitude')).toBe('42.1');
    expect(fetch.mock.calls[1][0].searchParams.get('wind_speed_unit')).toBe('kmh');
    expect(fetch.mock.calls[1][1].cache).toBe('no-store');
  });

  it('does not query the forecast when no place is found', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal('fetch', fetch);
    await expect(getCurrentWeather('Unknown town', signal())).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('rejects missing weather values rather than presenting them as zero', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ results: [place] }))
      .mockResolvedValueOnce(Response.json({ timezone: 'Europe/Madrid', current: { ...current, temperature_2m: null } })));
    await expect(getCurrentWeather('Berga', signal())).rejects.toThrow('Invalid current weather');
  });

  it('rejects provider errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('provider details', { status: 503 })));
    await expect(getCurrentWeather('Berga', signal())).rejects.toThrow('Weather provider request failed');
  });
});
