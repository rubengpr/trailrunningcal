'use client';

import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { WhatsAppIcon } from '@/components/icons/brand-icons';
import { track } from '@/lib/analytics/track';

interface RaceShareWhatsappButtonProps {
  message: string;
  label: string;
  iconOnly?: boolean;
  className?: string;
  raceId?: string;
  raceSlug?: string;
}

export default function RaceShareWhatsappButton({
  message,
  label,
  iconOnly = false,
  className = '',
  raceId,
  raceSlug,
}: RaceShareWhatsappButtonProps) {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const handleClick = () => {
    track(ANALYTICS_EVENTS.RACE_SHARE_CLICKED, {
      ...(raceId && { race_id: raceId }),
      ...(raceSlug && { race_slug: raceSlug }),
    });
  };

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      onClick={handleClick}
      className={`flex items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors font-medium whitespace-nowrap ${iconOnly ? 'p-2' : 'px-3 py-2'} ${className}`}
    >
      <WhatsAppIcon className="w-5 h-5 shrink-0" />
      {iconOnly ? (
        <span className="sm:hidden">{label}</span>
      ) : (
        <span>{label}</span>
      )}
    </a>
  );
}
