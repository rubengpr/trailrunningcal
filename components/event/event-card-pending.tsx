'use client';

import type { MouseEvent } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useLinkStatus } from 'next/link';

export default function EventCardPending() {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  const blockRepeatedClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      data-testid="event-card-pending"
      className="absolute inset-0 z-10 flex cursor-wait items-center justify-center rounded-lg bg-white/75"
      onClick={blockRepeatedClick}
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-6 text-gray-700 motion-safe:animate-spin"
        strokeWidth={1.75}
      />
    </div>
  );
}
