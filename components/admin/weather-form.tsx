'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { askWeather } from '@/lib/api/weather-assistant';
import { maxQuestionLength } from '@/lib/weather/utils';
import type { Locale } from '@/i18n';
import type { WeatherAnswer } from '@/types/weather.types';

export default function WeatherForm() {
  const t = useTranslations('admin.weather');
  const locale = useLocale() as Locale;
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<WeatherAnswer | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<'required' | 'requestFailed' | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setResult(null);
    if (!question.trim()) { setError('required'); return; }
    setError(null);
    setPending(true);
    try {
      setResult(await askWeather({ question: question.trim(), locale }));
    } catch {
      setError('requestFailed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <form onSubmit={submit} noValidate className="space-y-4">
        <label htmlFor="weather-question" className="block text-sm font-medium">{t('question')}</label>
        <textarea id="weather-question" value={question} maxLength={maxQuestionLength} rows={4}
          disabled={pending} placeholder={t('placeholder')}
          onChange={event => { setQuestion(event.target.value); setError(null); }}
          className="block w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-black disabled:opacity-50" />
        <Button type="submit" isLoading={pending} loadingText={t('sending')}>{t('submit')}</Button>
      </form>
      {error ? <ErrorMessage message={t(error)} showRetry={false} variant="compact" /> : null}
      <section aria-live="polite" aria-busy={pending} className="min-h-32 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium">{t('answer')}</h2>
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{result?.answer ?? (pending ? t('sending') : t('empty'))}</p>
        {result?.usedWeather ? <a href="https://open-meteo.com" target="_blank" rel="noreferrer"
          className="mt-3 inline-block cursor-pointer text-xs text-gray-500 underline underline-offset-4">{t('source')}</a> : null}
      </section>
    </div>
  );
}
