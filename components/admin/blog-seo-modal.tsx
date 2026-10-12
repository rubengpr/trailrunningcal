'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { BaseModal } from '@/components/ui/base-modal';

export function BlogSeoModal({ score, children }: {
  score: number; children: ReactNode;
}) {
  const t = useTranslations('admin.blog');
  const [isOpen, setIsOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  function close() {
    setIsOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={`${t('viewEvaluation')}: ${score}`}
        onClick={() => setIsOpen(true)}
        className={`inline-flex cursor-pointer items-center justify-center rounded-full px-3 py-1 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${
          score >= 90 ? 'bg-green-50 text-green-700 hover:bg-green-100'
            : score >= 50 ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
        }`}
      >
        {score}
      </button>
      {isOpen ? (
        <div
          ref={dialog}
          className="fixed inset-0 z-50 outline-none"
          role="dialog"
          aria-modal="true"
          aria-label={t('evaluation')}
          tabIndex={-1}
          onKeyDown={event => {
            if (event.key !== 'Tab') return;
            const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button');
            if (!buttons?.length) return;
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
        >
          <BaseModal isOpen onClose={close} title={t('evaluation')} closeLabel={t('closeEvaluation')} maxWidth="5xl" mobileFullscreen>
            <div className="w-full overflow-y-auto p-4 sm:max-h-[70dvh] sm:p-0">
              {children}
            </div>
          </BaseModal>
        </div>
      ) : null}
    </>
  );
}
