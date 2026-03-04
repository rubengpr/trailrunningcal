'use client';

import { useTranslations } from 'next-intl';
import { ProposeRaceForm } from './propose-race-form';
import { useState } from 'react';
import { BaseModal } from './base-modal';

interface ProposeRaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProposeRaceModal({ isOpen, onClose }: ProposeRaceModalProps) {
  const t = useTranslations('proposeRace');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSuccess = () => {
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2000);
  };

  const handleClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isSuccess ? t('successTitle') : t('title')}
      description={isSuccess ? t('successDescription') : t('description')}
    >
      {isSuccess ? (
        <div className="flex flex-col gap-6">
          <p className="text-sm sm:text-base text-gray-700">{t('successMessage')}</p>
        </div>
      ) : (
        <ProposeRaceForm onSuccess={handleSuccess} onClose={handleClose} />
      )}
    </BaseModal>
  );
}
