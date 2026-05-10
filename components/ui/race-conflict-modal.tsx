'use client';

import { useTranslations } from 'next-intl';
import { BaseModal } from '@/components/ui/base-modal';
import { Button } from '@/components/ui/button';
import type { ConflictingRace } from '@/types/race.types';

interface RaceConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictingRace[];
}

export function RaceConflictModal({ isOpen, onClose, conflicts }: RaceConflictModalProps) {
  const t = useTranslations('raceConflictModal');

  const showUrl = new Set(conflicts.map((c) => c.websiteUrl)).size > 1;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={t('title')} maxWidth="lg">
      <p className="mb-4 text-sm text-gray-600">{t('description')}</p>
      <ul className="mb-6 divide-y divide-gray-100 rounded-md border border-gray-200">
        {conflicts.map((race) => (
          <li key={race.id} className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-sm font-medium text-gray-900">{race.name}</span>
            <span className="text-xs text-gray-500">{race.date}</span>
            {showUrl && (
              <span className="truncate text-xs text-gray-400">{race.websiteUrl}</span>
            )}
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('close')}
        </Button>
      </div>
    </BaseModal>
  );
}
