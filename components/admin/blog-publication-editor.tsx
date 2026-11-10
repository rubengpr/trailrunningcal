'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { BaseModal } from '@/components/ui/base-modal';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { today, validateDetails } from '@/lib/blog/publication';
import { saveDetails } from '@/lib/api/blog-publication';
import { useBlogPublication } from '@/hooks/use-blog-publication';
import type { Publication } from '@/types/blog-publication.types';

export function BlogPublicationEditor({ id, publication, onSaved, onClose }: {
  id: string; publication: Publication; onSaved: (value: Publication) => void; onClose: () => void;
}) {
  const t = useTranslations('admin.blog.publication');
  const [author, setAuthor] = useState(publication.author ?? 'Ruben Godoy');
  const [imageAlt, setImageAlt] = useState(publication.imageAlt ?? '');
  const [date, setDate] = useState(publication.date ?? today());
  const [version] = useState(publication.version);
  const form = useRef<HTMLFormElement>(null);
  const mutation = useBlogPublication(onSaved);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    form.current?.querySelector('input')?.focus();
    const modal = form.current?.parentElement?.parentElement;
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = [...(modal?.querySelectorAll<HTMLElement>('input:not(:disabled),button:not(:disabled)') ?? [])];
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    modal?.addEventListener('keydown', trap);
    return () => { modal?.removeEventListener('keydown', trap); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const close = () => { if (!mutation.sending) onClose(); };
  return <BaseModal isOpen onClose={close} title={t('editTitle')} closeLabel={t('cancel')} maxWidth="md">
    <form ref={form} role="dialog" aria-label={t('editTitle')} aria-modal="true" noValidate className="space-y-4"
      onSubmit={async event => {
        event.preventDefault();
        const input = { author, date, imageAlt, version };
        try { validateDetails(input, !!publication.imagePath); }
        catch (error) { mutation.setError(error instanceof Error ? error.message : 'save_failed'); return; }
        if (await mutation.submit(() => saveDetails(id, input))) { toast.success(t('saved')); onClose(); }
      }}>
      <FormInput id="publication-author" label={t('author')} value={author} onChange={event => setAuthor(event.target.value)} disabled={mutation.sending} maxLength={120} />
      <FormInput id="publication-date" type="date" label={t('date')} helperText={t('dateHelp')} value={date} onChange={event => setDate(event.target.value)} disabled={mutation.sending} />
      <FormInput id="publication-image-alt" label={t('imageAlt')} value={imageAlt} onChange={event => setImageAlt(event.target.value)} disabled={mutation.sending} maxLength={300} />
      {mutation.error ? <ErrorMessage message={t(mutation.error)} variant="compact" showRetry={false} /> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={close} disabled={mutation.sending}>{t('cancel')}</Button>
        <Button type="submit" disabled={mutation.sending} isLoading={mutation.sending} loadingText={t('saving')}>{t('save')}</Button>
      </div>
    </form>
  </BaseModal>;
}
