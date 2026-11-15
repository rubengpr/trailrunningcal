'use client';

import { useLinkStatus } from 'next/link';
import { createPortal } from 'react-dom';
import { EventPageSkeleton } from '@/components/event/event-page-skeleton';

export function EventNavigationLoading() {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return createPortal(
    <div
      data-event-navigation-loading
      aria-busy="true"
      role="presentation"
      onClick={(event) => event.stopPropagation()}
      ref={(element) => {
        if (!element) return;
        const header = document.getElementById('main-content')?.previousElementSibling;
        element.style.top = `${Math.max(0, header?.getBoundingClientRect().bottom ?? 0)}px`;
      }}
      className="fixed inset-x-0 bottom-0 z-20 overflow-y-auto overscroll-contain bg-white"
    >
      <EventPageSkeleton />
    </div>,
    document.body,
  );
}
