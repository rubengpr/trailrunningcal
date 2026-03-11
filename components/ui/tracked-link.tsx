'use client';

import Link from 'next/link';
import posthog from 'posthog-js';

interface TrackedLinkProps {
  href: string;
  children: React.ReactNode;
  eventName: string;
  eventProperties?: Record<string, unknown>;
  className?: string;
  external?: boolean;
}

export function TrackedLink({
  href,
  children,
  eventName,
  eventProperties,
  className,
  external = false,
}: TrackedLinkProps) {
  const handleClick = () => {
    posthog.capture(eventName, eventProperties ?? {});
  };

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
