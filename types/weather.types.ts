import type { Locale } from '@/i18n';

export interface WeatherQuestion {
  question: string;
  locale: Locale;
}

export interface WeatherAnswer {
  answer: string;
  usedWeather: boolean;
}

export interface CurrentWeather {
  location: string;
  time: string;
  timezone: string;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  precipitationMm: number;
  windSpeedKmh: number;
  weatherCode: number;
}
