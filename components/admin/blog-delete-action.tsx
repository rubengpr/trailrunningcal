'use client';
import { useEffect, useRef } from 'react';
import { Ellipsis, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { canDelete } from '@/lib/blog/utils';
import { useBlogDeletion } from '@/hooks/use-blog-deletion';
import { TableActionButton } from '@/components/ui/table-action-button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { IconActionMenu } from '@/components/ui/icon-action-menu';
import type { DraftSummary } from '@/types/blog-draft-record.types';

export function BlogDeleteAction({ draft, onDeleted, onConflict, menu = false }: {
  draft: Pick<DraftSummary, 'id' | 'title' | 'instructions' | 'status' | 'evaluationStatus' | 'researchStatus'>;
  onDeleted: (id: string) => void; onConflict: () => void;
  menu?: boolean;
}) {
  const t = useTranslations('admin.blog.delete');
  const trigger = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const menuContainer = useRef<HTMLDivElement>(null);
  const allowed = canDelete(draft);
  const deletion = useBlogDeletion(draft.id, missing => {
    if (missing) toast.error(t('missing')); else toast.success(t('success'));
    onDeleted(draft.id);
  }, onConflict);
  useEffect(() => {
    if (!deletion.open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = previous; trigger.current?.focus(); };
  }, [deletion.open]);
  return <>
    {menu ? <div ref={menuContainer}>
      <IconActionMenu triggerAriaLabel={t('actions')} triggerIcon={<Ellipsis className="size-5" aria-hidden="true" />}
        disabled={deletion.sending} items={[{
          id: 'delete', label: t('button'), tone: 'destructive',
          icon: <Trash2 className="size-4 shrink-0" aria-hidden="true" />,
          disabled: !allowed, title: allowed ? undefined : t('processing'),
          onSelect: () => { trigger.current = menuContainer.current?.querySelector('button') ?? null; deletion.show(); },
        }]} />
    </div> : <TableActionButton title={allowed ? t('button') : t('processing')} tone="destructive" disabled={!allowed || deletion.sending}
      onClick={event => { event.stopPropagation(); trigger.current = event.currentTarget; deletion.show(); }}>
      <Trash2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
    </TableActionButton>}
    {deletion.open ? <div ref={dialog} className="fixed inset-0 z-50 outline-none" role="dialog" aria-modal="true" aria-label={t('title')} tabIndex={-1}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <ConfirmationModal isOpen onClose={deletion.close} onConfirm={() => { if (allowed) void deletion.submit(); }}
        title={t('title')} message={t('message')} highlight={draft.title || draft.instructions.replace(/\s+/g, ' ').slice(0, 80)}
        confirmButtonText={t('confirm')} cancelButtonText={t('cancel')} loadingText={t('deleting')}
        isSubmitting={deletion.sending} confirmDisabled={!allowed} errorMessage={deletion.error ? t(deletion.error) : undefined}
        variant="destructive" maxWidth="md" />
    </div> : null}
  </>;
}
