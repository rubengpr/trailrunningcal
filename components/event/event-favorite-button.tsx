'use client';

import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { FavoriteButton } from '@/components/race/favorite-button';
import { useEventFavorites } from '@/hooks/use-event-favorites';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

interface EventFavoriteButtonProps {
  eventId: string;
  eventSlug: string;
  saveLabel: string;
  removeLabel: string;
  iconOnly?: boolean;
  className?: string;
}

export function EventFavoriteButton({
  eventId,
  eventSlug,
  saveLabel,
  removeLabel,
  iconOnly,
  className,
}: EventFavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useEventFavorites();
  const t = useTranslations('event.favorite');
  const favorited = isFavorite(eventId);

  const heartIcon = <Heart className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" stroke="none" />;

  const handleToggle = () => {
    const wasFavorited = favorited;
    track(ANALYTICS_EVENTS.EVENT_FAVORITE_CLICKED, {
      event_id: eventId,
      event_slug: eventSlug,
      action: wasFavorited ? 'remove' : 'save',
    });
    toggleFavorite(eventId);
    if (!wasFavorited) {
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        toast.custom((toastState) => (
          <div
            className="fixed bottom-0 left-0 right-0 z-9999 flex items-center gap-3 bg-white border-t border-gray-200 px-5 py-4 text-sm font-medium text-gray-800"
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
