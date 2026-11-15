'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import type { Locale } from '@/i18n';

interface FavoritesNavLinkProps {
  href: string;
  locale: Locale;
  hasFavorites: boolean;
  className?: string;
  iconClassName?: string;
  title?: string;
}

export function FavoritesNavLink({
  href,
  locale,
  hasFavorites,
  className = '',
  iconClassName = '',
  title,
}: FavoritesNavLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`relative cursor-pointer ${className}`}
      title={title}
      onClick={() =>
        setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, {
          link_text: 'my_events',
          link_href: href,
          locale,
        }), 0)
      }
    >
      <Heart className={`size-5 ${iconClassName}`} strokeWidth={1.5} />
      {hasFavorites && (
        <span className="absolute top-0 right-0 block size-2 rounded-full bg-red-500" />
      )}
    </Link>
  );
}
