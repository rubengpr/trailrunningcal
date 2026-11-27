import type { Ref } from 'react';

export const EVENT_TRACK_MAP_CLASS_NAME = 'h-[336px] w-full bg-stone-100 sm:h-[480px]';

export function EventTrackMapPlaceholder({ ref, testId }: {
  ref?: Ref<HTMLDivElement>;
  testId?: string;
}) {
  return (
    <div
      ref={ref}
      className={EVENT_TRACK_MAP_CLASS_NAME}
      data-event-track-map-placeholder
      data-testid={testId}
    />
  );
}
