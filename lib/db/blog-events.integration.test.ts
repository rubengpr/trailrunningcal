import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
vi.mock('@/lib/supabase/server', () => ({createAdminClient: () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {auth: {persistSession: false}})}));
import { listEvents, selectedEvents } from './blog-events';
import { provinces } from '@/lib/blog/regions';
const integration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true' ? describe : describe.skip;
integration('local regional event queries', () => {
  beforeAll(() => { if (new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname !== 'wghqldoshvwulyqqbqln.supabase.co') throw new Error('Only trailrunningcal-local is allowed'); });
  it('returns unique events and only community modalities, with a stable second page', async () => {
    const first = await listEvents('catalonia','',1);
    expect(first.events.length).toBeGreaterThanOrEqual(5);
    expect(new Set(first.events.map(event => event.id)).size).toBe(first.events.length);
    first.events.forEach(event => event.races.forEach(race => expect(provinces('catalonia')).toContain(race.province)));
    const second = await listEvents('catalonia','',2);
    expect(second.events.some(event => first.events.some(other => other.id === event.id))).toBe(false);
    expect(second.pagination.total).toBe(first.pagination.total);
  });
  it('resolves snapshots by ID, rejects a different community, and supports searches', async () => {
    const page = await listEvents('catalonia','',1);
    const events = await selectedEvents('catalonia',page.events.slice(0,5).map(event => event.id));
    expect(events).toHaveLength(5);
    expect(await selectedEvents('aragon',events.map(event => event.id))).toEqual([]);
    expect((await listEvents('catalonia',events[0].name,1)).events.some(event => event.id === events[0].id)).toBe(true);
  });
});
