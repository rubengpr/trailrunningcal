'use client';

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
  const favorited = isFavorite(raceId);

  return (
    <FavoriteButton
      isFavorited={favorited}
      onToggle={() => toggleFavorite(raceId)}
      label={favorited ? removeLabel : saveLabel}
      iconOnly={iconOnly}
      className={className}
    />
  );
}
