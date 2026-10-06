'use client';

import { ArrowRight } from 'lucide-react';
import type { Locale } from '@/i18n';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

interface NewsletterFormProps {
  locale: Locale;
  emailLabel: string;
  emailPlaceholder: string;
  submitLabel: string;
}

export function NewsletterForm({
  locale,
  emailLabel,
  emailPlaceholder,
  submitLabel,
}: NewsletterFormProps) {
  const handleSubmitClick = () => {
    track(ANALYTICS_EVENTS.NEWSLETTER_SUBSCRIBE_CLICKED, { locale });
  };

  return (
    <form className="flex w-full max-w-sm border border-[#547064] bg-[#f6f1e4]/70">
      <label className="sr-only" htmlFor="footer-newsletter-email">
        {emailLabel}
      </label>
      <input
        id="footer-newsletter-email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder={emailPlaceholder}
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#082f26] outline-none placeholder:text-[#547064]"
      />
      <button
        type="button"
        aria-label={submitLabel}
        onClick={handleSubmitClick}
        className="flex size-11 shrink-0 items-center justify-center border-l border-[#547064] text-[#31564b] transition-colors hover:bg-[#31564b] hover:text-[#f6f1e4]"
      >
        <ArrowRight className="size-5" strokeWidth={1.5} />
      </button>
    </form>
  );
}
