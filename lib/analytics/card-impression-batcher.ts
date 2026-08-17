import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

type PageType = 'homepage' | 'finder_type' | 'finder_province_distance';

interface QueuedImpression {
  event_id: string;
  event_slug: string;
  list_position: number;
}

const FLUSH_DEBOUNCE_MS = 2000;
const MAX_BUFFER_SIZE = 50;

interface Buffer {
  seen: Set<string>;
  impressions: QueuedImpression[];
  flushTimer: ReturnType<typeof setTimeout> | null;
}

const buffers = new Map<PageType, Buffer>();

function getBuffer(pageType: PageType): Buffer {
  let buffer = buffers.get(pageType);
  if (!buffer) {
    buffer = { seen: new Set(), impressions: [], flushTimer: null };
    buffers.set(pageType, buffer);
  }
  return buffer;
}

function flush(pageType: PageType): void {
  const buffer = buffers.get(pageType);
  if (!buffer || buffer.impressions.length === 0) return;

  if (buffer.flushTimer) {
    clearTimeout(buffer.flushTimer);
    buffer.flushTimer = null;
  }

  const impressions = buffer.impressions;
  buffer.impressions = [];

  track(
    ANALYTICS_EVENTS.RACE_CARD_IMPRESSIONS_BATCH,
    { page_type: pageType, impressions },
    { transport: 'sendBeacon' },
  );
}

export function queueCardImpression(pageType: PageType, impression: QueuedImpression): void {
  const buffer = getBuffer(pageType);
  if (buffer.seen.has(impression.event_id)) return;

  buffer.seen.add(impression.event_id);
  buffer.impressions.push(impression);

  if (buffer.impressions.length >= MAX_BUFFER_SIZE) {
    flush(pageType);
    return;
  }

  if (buffer.flushTimer) clearTimeout(buffer.flushTimer);
  buffer.flushTimer = setTimeout(() => flush(pageType), FLUSH_DEBOUNCE_MS);
}

function flushAllCardImpressions(): void {
  for (const pageType of buffers.keys()) flush(pageType);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAllCardImpressions);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAllCardImpressions();
  });
}
