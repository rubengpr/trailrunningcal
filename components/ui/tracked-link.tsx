'use client';

import Link from 'next/link';
import type { AnalyticsEventName, AnalyticsEventProperties } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

interface TrackedLinkProps<EventName extends AnalyticsEventName = AnalyticsEventName> {
  href: string;
  children: React.ReactNode;
  eventName: EventName;
  eventProperties?: AnalyticsEventProperties[EventName];
  className?: string;
  external?: boolean;
}

export function TrackedLink<EventName extends AnalyticsEventName>({
  href,
  children,
  eventName,
  eventProperties,
  className,
  external = false,
}: TrackedLinkProps<EventName>) {
  const handleClick = () => {
    track(eventName, eventProperties);
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
