import posthog from 'posthog-js';
import type { AnalyticsEventName, AnalyticsEventProperties } from '@/lib/analytics/events';

export function track<EventName extends AnalyticsEventName>(
  eventName: EventName,
  properties?: AnalyticsEventProperties[EventName],
): void {
  posthog.capture(eventName, properties ?? {});
}
