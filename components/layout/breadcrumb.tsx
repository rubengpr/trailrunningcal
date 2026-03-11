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
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span>/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-gray-900 transition-colors"
              onClick={() => handleLinkClick(item)}
            >
              {item.name}
            </Link>
          ) : (
            <span className="text-gray-700">{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
