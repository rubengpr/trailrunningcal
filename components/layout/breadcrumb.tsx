'use client';

import Link from 'next/link';
import posthog from 'posthog-js';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  captureContext?: Record<string, unknown>;
}

export function Breadcrumb({ items, captureContext }: BreadcrumbProps) {
  const handleLinkClick = (item: BreadcrumbItem) => {
    if (item.href) {
      posthog.capture('breadcrumb_link_clicked', {
        link_name: item.name,
        href: item.href,
        ...captureContext,
      });
    }
  };

  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-2 min-w-0">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className={`flex items-center gap-1.5${isLast ? ' min-w-0' : ' shrink-0'}`}>
            {index > 0 && <span className="shrink-0">/</span>}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-gray-900 transition-colors"
                onClick={() => handleLinkClick(item)}
              >
                {item.name}
              </Link>
            ) : (
              <span className={`text-gray-700${isLast ? ' truncate' : ''}`}>{item.name}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
