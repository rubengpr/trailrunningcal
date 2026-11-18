import { locales, type Locale } from '@/i18n';
import { assertRequestBody, ValidationError } from '@/app/api/request-validation';
import { maxQuestionLength } from '@/lib/weather/utils';
import type { WeatherQuestion } from '@/types/weather.types';

export function parseInput(body: unknown): WeatherQuestion {
  assertRequestBody(body);
  if (typeof body.question !== 'string' || !body.question.trim() || body.question.trim().length > maxQuestionLength) {
    throw new ValidationError('Invalid question', 400);
  }
  if (typeof body.locale !== 'string' || !locales.includes(body.locale as Locale)) {
    throw new ValidationError('Invalid locale', 400);
  }
  return { question: body.question.trim(), locale: body.locale as Locale };
}
