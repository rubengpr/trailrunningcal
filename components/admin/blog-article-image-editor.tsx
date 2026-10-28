'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BaseModal } from '@/components/ui/base-modal';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { useModalFocus } from '@/hooks/use-modal-focus';
import type { ImageBlock } from '@/types/blog-article-block.types';

export function BlogArticleImageEditor({ image, sending, error, onSave, onClose }: {
  image: ImageBlock; sending: boolean; error: string | null; onSave: (alt: string, caption: string) => Promise<void>; onClose: () => void;
}) {
  const t = useTranslations('admin.blog.articleImages');
  const [alt, setAlt] = useState(image.alt), [caption, setCaption] = useState(image.caption);
  const container = useModalFocus();
  return <div ref={container} role="dialog" aria-modal="true" aria-label={t('edit')}>
    <BaseModal isOpen title={t('edit')} closeLabel={t('cancel')} onClose={() => { if (!sending) onClose(); }} maxWidth="md">
      <form noValidate className="space-y-4" onSubmit={event => { event.preventDefault(); void onSave(alt, caption); }}>
        <FormInput id="article-image-alt" label={t('alt')} value={alt} onChange={event => setAlt(event.target.value)} maxLength={300} disabled={sending} />
        <FormInput id="article-image-caption" label={t('caption')} value={caption} onChange={event => setCaption(event.target.value)} maxLength={500} disabled={sending} />
        {error ? <ErrorMessage message={t(error)} showRetry={false} variant="compact" /> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={sending} onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" disabled={sending} isLoading={sending} loadingText={t('saving')}>{t('save')}</Button>
        </div>
      </form>
    </BaseModal>
  </div>;
}
