import type { WeatherAnswer, WeatherQuestion } from '@/types/weather.types';

export async function askWeather(input: WeatherQuestion): Promise<WeatherAnswer> {
  const response = await fetch('/api/weather-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Weather request failed');
  const body = await response.json();
  return body.data as WeatherAnswer;
}
