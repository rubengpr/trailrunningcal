'use client';

import toast from 'react-hot-toast';
import posthog from 'posthog-js';
import { useTranslations } from 'next-intl';
import { useFavorites } from '@/hooks/use-favorites';
import { FavoriteButton } from './favorite-button';

interface RaceFavoriteButtonProps {
  raceId: string;
  saveLabel: string;
  removeLabel: string;
  iconOnly?: boolean;
  className?: string;
}

export function RaceFavoriteButton({ raceId, saveLabel, removeLabel, iconOnly, className }: RaceFavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const t = useTranslations('race.favorite');
  const favorited = isFavorite(raceId);

  const heartIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500 shrink-0">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.218l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
    </svg>
  );

  const handleToggle = () => {
    const wasFavorited = favorited;
    posthog.capture('race_favorite_clicked', {
      race_id: raceId,
      action: wasFavorited ? 'remove' : 'save',
    });
    toggleFavorite(raceId);
    if (!wasFavorited) {
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        toast.custom((toastState) => (
          <div
            className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center gap-3 bg-white border-t border-gray-200 px-5 py-4 text-sm font-medium text-gray-800"
            style={{
              transform: toastState.visible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {heartIcon}
            {t('savedToast')}
          </div>
        ), {
          duration: 2500,
          style: { padding: 0, margin: 0, background: 'transparent', border: 'none', boxShadow: 'none' },
        });
      } else {
        toast.custom((toastState) => (
          <div
            className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg shadow-md px-4 py-3 text-sm font-medium text-gray-800"
            style={{
              opacity: toastState.visible ? 1 : 0,
              transform: toastState.visible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}
          >
            {heartIcon}
            {t('savedToast')}
          </div>
        ), { duration: 2500 });
      }
    }
  };

  const displayLabel = iconOnly ? t('label') : (favorited ? removeLabel : saveLabel);
  const tooltipLabel = favorited ? removeLabel : saveLabel;

  return (
    <FavoriteButton
      isFavorited={favorited}
      onToggle={handleToggle}
      label={displayLabel}
      title={tooltipLabel}
      iconOnly={iconOnly}
      className={className}
    />
  );
}
