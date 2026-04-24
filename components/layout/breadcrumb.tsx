'use client';

import type { ReactElement } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  captureContext?: Record<string, unknown>;
}

function BreadcrumbChevron(): ReactElement {
  return (
    <span className="inline-flex h-[1em] shrink-0 items-center justify-center text-gray-400">
      <ChevronRight className="block h-[0.85em] w-[0.85em] shrink-0" strokeWidth={2.5} />
    </span>
  );
}

export function Breadcrumb({ items, captureContext }: BreadcrumbProps) {
  const handleLinkClick = (item: BreadcrumbItem) => {
    if (item.href) {
      track(ANALYTICS_EVENTS.BREADCRUMB_LINK_CLICKED, {
        link_name: item.name,
        href: item.href,
        ...captureContext,
      });
    }
  };

  return (
    <nav className="flex items-center gap-0.5 text-xs leading-none text-gray-500 mb-2 min-w-0">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span
            key={index}
            className={`flex min-h-[1em] items-center gap-0.5${isLast ? ' min-w-0' : ' shrink-0'}`}
          >
            {index > 0 && <BreadcrumbChevron />}
            {item.href ? (
              <Link
                href={item.href}
                className="inline-flex min-h-[1em] items-center hover:text-gray-900 transition-colors"
                onClick={() => handleLinkClick(item)}
              >
                {item.name}
              </Link>
            ) : (
              <span className={`inline-flex min-h-[1em] items-center text-gray-700${isLast ? ' min-w-0 truncate' : ''}`}>
                {item.name}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
