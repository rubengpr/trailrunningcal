'use client';
import { useTranslations } from 'next-intl';
import { BaseModal } from '@/components/ui/base-modal';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { useModalFocus } from '@/hooks/use-modal-focus';

export function BlogExportError({ error, onClose }: { error: string; onClose: () => void }) {
  const t = useTranslations('admin.blog.export');
  const dialog = useModalFocus();
  return <BaseModal isOpen title={t('button')} closeLabel={t('close')} onClose={onClose} maxWidth="md">
    <div ref={dialog} role="dialog" aria-modal="true" aria-label={t('button')} tabIndex={-1}>
      <ErrorMessage title={t('errorTitle')} message={t(error)} showRetry={false} variant="compact" />
      <div className="mt-4 flex justify-end"><Button onClick={onClose}>{t('close')}</Button></div>
    </div>
  </BaseModal>;
}
