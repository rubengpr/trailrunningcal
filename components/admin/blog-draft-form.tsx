'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ErrorMessage, FormErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import { useBlog } from '@/hooks/use-blog';
import { MAX_INSTRUCTION_LENGTH, validateInstructions } from '@/lib/blog/utils';

export function BlogDraftForm() {
  const t = useTranslations('admin.blog');
  const { instructions, setInstructions, submit, isSubmitting, requestFailed, acceptedId, clearRequestError } = useBlog();
  const [error, setError] = useState<'tooShort' | 'tooLong' | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const characterCount = instructions.trim().length;

  useLayoutEffect(() => {
    function resize() {
      const element = textarea.current;
      if (!element) return;
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [instructions]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const validationError = validateInstructions(instructions);
    setError(validationError);
    if (validationError) {
      textarea.current?.focus();
      return;
    }
    void submit(instructions.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <label htmlFor="blog-instructions" className="block text-sm font-medium text-gray-900">
        {t('newArticle')}
      </label>
      <div className="flex items-end gap-3 rounded-xl border border-gray-200 bg-white p-3 focus-within:border-gray-400">
        <textarea
          ref={textarea}
          id="blog-instructions"
          rows={2}
          value={instructions}
          disabled={isSubmitting}
          placeholder={t('promptPlaceholder')}
          className="min-h-16 min-w-0 flex-1 resize-none overflow-hidden bg-transparent px-1 py-2 text-sm leading-6 text-gray-900 placeholder:text-gray-400 focus-visible:outline-none disabled:opacity-50"
          onChange={event => {
            setInstructions(event.target.value);
            setError(null);
            clearRequestError();
          }}
        />
        <Button type="submit" disabled={isSubmitting} className="h-10 w-36 shrink-0 gap-2 whitespace-nowrap px-3">
          {isSubmitting ? <LoaderCircle className="size-4 shrink-0 animate-spin" /> : <Sparkles className="size-4 shrink-0" />}
          {isSubmitting ? t('sending') : t('submitArticle')}
        </Button>
      </div>
      <p className={`text-right text-xs tabular-nums ${characterCount > MAX_INSTRUCTION_LENGTH ? 'text-red-700' : 'text-gray-500'}`}>
        {t('characterCount', { count: characterCount, max: MAX_INSTRUCTION_LENGTH })}
      </p>
      {error ? <FormErrorMessage message={t(error)} /> : null}
      {requestFailed ? <ErrorMessage message={t('requestFailed')} showRetry={false} variant="compact" /> : null}
      {(isSubmitting || acceptedId) && (
        <p role="status" className="text-xs leading-relaxed text-gray-500">
          {isSubmitting ? t('sendingNotice') : t('acceptedNotice')}
        </p>
      )}
    </form>
  );
}
