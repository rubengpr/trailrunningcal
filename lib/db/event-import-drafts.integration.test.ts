import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const integrationDescribe = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true'
  ? describe : describe.skip;
let admin: SupabaseClient;
const draftIds: string[] = [];

integrationDescribe('draft date sorting integration', () => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || new URL(url).hostname.split('.')[0] !== 'wghqldoshvwulyqqbqln') {
      throw new Error('Integration tests must target trailrunningcal-local');
    }
    admin = createClient(url, key);
  });

  afterEach(async () => {
    if (!draftIds.length) return;
    const { error } = await admin.from('event_import_drafts').delete().in('id', draftIds.splice(0));
    if (error) throw error;
  });

  it('ignores malformed and impossible stored dates while preserving valid ordering', async () => {
    const search = `draft-dates-${randomUUID()}`;
    const { data, error } = await admin.from('event_import_drafts').insert([
      ['A invalid', ['2027-02-30', 'not-a-date']],
      ['B unknown', [null]],
      ['C leap', ['2028-02-29']],
      ['D mixed', ['2027-02-30', '2027-03-01']],
    ].map(([name, dates]) => ({
      data: {
        event: { name: `${search} ${name}` },
        races: (dates as Array<string | null>).map((date) => ({ date })),
      },
    }))).select('id, data');
    if (error || !data) throw error ?? new Error('Failed to create draft fixtures');
    draftIds.push(...data.map((row) => row.id));
    const byName = new Map(data.map((row) => [row.data.event.name, row.id]));

    for (const direction of ['asc', 'desc']) {
      const { data: page, error: pageError } = await admin.rpc('get_event_import_drafts_page', {
        p_limit: 50, p_offset: 0, p_search: search,
        p_sort_column: 'dates', p_sort_direction: direction,
      });
      expect(pageError).toBeNull();
      expect(page?.[0].total_count).toBe(4);
      const ordered = direction === 'asc'
        ? ['A invalid', 'B unknown', 'D mixed', 'C leap']
        : ['A invalid', 'B unknown', 'C leap', 'D mixed'];
      expect(page?.[0].draft_ids).toEqual(ordered.map((name) => byName.get(`${search} ${name}`)));
    }
  });
});
