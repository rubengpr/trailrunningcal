import type { CurrentWeather } from '@/types/weather.types';

interface LocationResponse {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    country?: string;
  }[];
}

interface ForecastResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    weather_code: number;
  };
}

async function read<T>(url: URL, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  if (!response.ok) throw new Error('Weather provider request failed');
  return response.json() as Promise<T>;
}

export async function getCurrentWeather(
  location: string,
  signal: AbortSignal,
): Promise<CurrentWeather | null> {
  const search = new URL('https://geocoding-api.open-meteo.com/v1/search');
  search.search = new URLSearchParams({
    name: location,
    count: '1',
    language: 'es',
    format: 'json',
  }).toString();
  const places = await read<LocationResponse>(search, signal);
  const place = places.results?.[0];
  if (!place) return null;
  if (!place.name || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
    throw new Error('Invalid weather location');
  }

  const forecast = new URL('https://api.open-meteo.com/v1/forecast');
  forecast.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    timezone: 'auto',
    forecast_days: '1',
  }).toString();
  const data = await read<ForecastResponse>(forecast, signal);
  const current = data.current;
  const values = [current?.temperature_2m, current?.apparent_temperature,
    current?.relative_humidity_2m, current?.precipitation,
    current?.wind_speed_10m, current?.weather_code];
  if (!current?.time || !data.timezone || !values.every(Number.isFinite)) {
    throw new Error('Invalid current weather');
  }
  return {
    location: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
    time: current.time,
    timezone: data.timezone,
    temperatureC: current.temperature_2m,
    apparentTemperatureC: current.apparent_temperature,
    humidityPercent: current.relative_humidity_2m,
    precipitationMm: current.precipitation,
    windSpeedKmh: current.wind_speed_10m,
    weatherCode: current.weather_code,
  };
}
