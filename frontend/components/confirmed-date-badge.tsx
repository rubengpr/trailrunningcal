import { getTranslations } from 'next-intl/server';

interface ConfirmedDateBadgeProps {
  locale: string;
}

export async function ConfirmedDateBadge({ locale }: ConfirmedDateBadgeProps) {
  const t = await getTranslations({ locale, namespace: 'race' });
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      ✓ {t('confirmedDate')}
    </span>
  );
}
