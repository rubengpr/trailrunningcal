import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { track } from '@/lib/analytics/track';
import { queueCardImpression } from '@/lib/analytics/card-impression-batcher';

vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

describe('card-impression-batcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('batches impressions on the same page into a single flush after the debounce window', async () => {
    queueCardImpression('homepage', { event_id: 'batch-a', event_slug: 'batch-a', list_position: 1 });
    queueCardImpression('homepage', { event_id: 'batch-b', event_slug: 'batch-b', list_position: 2 });

    expect(track).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      'race_card_impressions_batch',
      {
        page_type: 'homepage',
        impressions: [
          { event_id: 'batch-a', event_slug: 'batch-a', list_position: 1 },
          { event_id: 'batch-b', event_slug: 'batch-b', list_position: 2 },
        ],
      },
      { transport: 'sendBeacon' },
    );
  });

  it('deduplicates repeated impressions of the same event within a page', async () => {
    queueCardImpression('finder_type', { event_id: 'dup-a', event_slug: 'dup-a', list_position: 1 });
    queueCardImpression('finder_type', { event_id: 'dup-a', event_slug: 'dup-a', list_position: 1 });

    await vi.advanceTimersByTimeAsync(2000);

    expect(track).toHaveBeenCalledTimes(1);
    const [, properties] = vi.mocked(track).mock.calls[0]!;
    expect((properties as { impressions: unknown[] }).impressions).toHaveLength(1);
  });

  it('flushes each page type independently', async () => {
    queueCardImpression('homepage', { event_id: 'indep-a', event_slug: 'indep-a', list_position: 1 });
    queueCardImpression('finder_province_distance', { event_id: 'indep-b', event_slug: 'indep-b', list_position: 1 });

    await vi.advanceTimersByTimeAsync(2000);

    expect(track).toHaveBeenCalledTimes(2);
    const pageTypes = vi.mocked(track).mock.calls.map(([, properties]) => (properties as { page_type: string }).page_type);
    expect(pageTypes.sort()).toEqual(['finder_province_distance', 'homepage']);
  });

  it('flushes immediately once the buffer reaches the max size, without waiting for the debounce', async () => {
    for (let i = 0; i < 50; i += 1) {
      queueCardImpression('homepage', { event_id: `max-${i}`, event_slug: `max-${i}`, list_position: i + 1 });
    }

    expect(track).toHaveBeenCalledTimes(1);
    const [, properties] = vi.mocked(track).mock.calls[0]!;
    expect((properties as { impressions: unknown[] }).impressions).toHaveLength(50);
  });
});
