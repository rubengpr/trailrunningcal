'use client';

import { useState } from 'react';
import {
  Check,
  Clock3,
  GlassWater,
  ImageIcon,
  Lightbulb,
  Map,
  Soup,
  Star,
  Trophy,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFeatureFlagVariantKey } from 'posthog-js/react';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

const FEEDBACK_COPY_FLAG_KEY = 'event-feature-feedback-copy';

const FEATURE_OPTIONS = [
  { id: 'route_map', icon: Map },
  { id: 'photos', icon: ImageIcon },
  { id: 'services', icon: Soup },
  { id: 'aid_stations', icon: GlassWater },
  { id: 'schedule', icon: Clock3 },
  { id: 'results', icon: Trophy },
  { id: 'reviews', icon: Star },
  { id: 'other', icon: Lightbulb },
] as const;

type FeatureId = (typeof FEATURE_OPTIONS)[number]['id'];
type PromptVariant = 'control' | 'more_information';

interface EventFeatureFeedbackProps {
  eventId: string;
  eventSlug: string;
}

export function EventFeatureFeedback({
  eventId,
  eventSlug,
}: EventFeatureFeedbackProps) {
  const t = useTranslations('event.featureFeedback');
  const flagVariant = useFeatureFlagVariantKey(FEEDBACK_COPY_FLAG_KEY);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureId[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const promptVariant: PromptVariant =
    flagVariant === 'more_information' ? 'more_information' : 'control';

  const toggleFeature = (feature: FeatureId) => {
    const isSelected = selectedFeatures.includes(feature);

    setSelectedFeatures((currentFeatures) =>
      isSelected
        ? currentFeatures.filter((currentFeature) => currentFeature !== feature)
        : [...currentFeatures, feature],
    );

    track(ANALYTICS_EVENTS.EVENT_FEATURE_FEEDBACK_OPTION_TOGGLED, {
      event_id: eventId,
      event_slug: eventSlug,
      feature,
      action: isSelected ? 'remove' : 'select',
      prompt_variant: promptVariant,
    });
  };

  const handleSubmit = () => {
    if (selectedFeatures.length === 0 && comment.trim().length === 0) return;

    track(ANALYTICS_EVENTS.EVENT_FEATURE_FEEDBACK_SUBMITTED, {
      event_id: eventId,
      event_slug: eventSlug,
      features: selectedFeatures,
      comment: comment.trim() || undefined,
      prompt_variant: promptVariant,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="font-semibold text-emerald-950">{t('successTitle')}</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-800">{t('successDescription')}</p>
          </div>
        </div>
      </section>
    );
  }

  const canSubmit = selectedFeatures.length > 0 || comment.trim().length > 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 px-5 py-6 sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute -right-12 -top-20 h-44 w-44 rounded-full border-[28px] border-emerald-100/60" />
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-emerald-50 shadow-sm">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-snug text-stone-950 sm:text-xl">
              {t(promptVariant === 'more_information' ? 'titleMoreInformation' : 'title')}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-stone-600">
              {t('description')}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {FEATURE_OPTIONS.map(({ id, icon: Icon }) => {
            const isSelected = selectedFeatures.includes(id);

            return (
              <button
                key={id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleFeature(id)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                  isSelected
                    ? 'border-emerald-800 bg-emerald-900 text-white shadow-sm'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-emerald-500 hover:text-emerald-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(`options.${id}`)}
                {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="event-feature-feedback-comment" className="text-sm font-medium text-stone-800">
              {t('commentLabel')}
            </label>
            <textarea
              id="event-feature-feedback-comment"
              value={comment}
              maxLength={300}
              rows={2}
              onChange={(event) => setComment(event.target.value)}
              placeholder={t('commentPlaceholder')}
              className="mt-2 block w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40"
          >
            {t('submit')}
          </button>
        </div>
      </div>
    </section>
  );
}
