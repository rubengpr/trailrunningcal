'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BaseModal } from '@/components/ui/base-modal';
import { IconButton } from '@/components/ui/icon-button';

interface EventDescriptionReviewModalProps {
  eventName: string;
  currentDescription: string;
  draftDescription: string;
  onClose: () => void;
  onSave: () => void;
}

export function EventDescriptionReviewModal({ eventName, currentDescription, draftDescription, onClose, onSave }: EventDescriptionReviewModalProps): React.ReactElement {
  const t = useTranslations('adminEventDescriptions');
  return <BaseModal isOpen onClose={onClose} title={eventName} maxWidth="2xl"><div className="flex flex-col gap-6">
    {draftDescription && <div className="flex flex-col gap-2"><p className="text-xs font-medium uppercase tracking-wide text-blue-600">{t('draft')}</p><p className="whitespace-pre-line text-xs leading-5 text-gray-900">{draftDescription}</p></div>}
    {currentDescription && <div className="flex flex-col gap-2"><p className={`text-xs font-medium uppercase tracking-wide ${draftDescription ? 'text-gray-400' : 'text-gray-500'}`}>{t('current')}</p><p className={`whitespace-pre-line text-xs leading-5 ${draftDescription ? 'text-gray-400' : 'text-gray-700'}`}>{currentDescription}</p></div>}
    {!currentDescription && !draftDescription && <p className="text-sm text-gray-400">{t('descriptionPlaceholder')}</p>}
    {draftDescription && <div className="flex justify-end"><IconButton onClick={onSave} title={t('save')}><Check className="h-4 w-4" strokeWidth={1.8} /></IconButton></div>}
  </div></BaseModal>;
}
