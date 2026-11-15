import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: () => mocks }),
}));

import { getBatchItems, getItemArtifacts } from './event-import-batches';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.select.mockReturnValue(mocks);
  mocks.eq.mockReturnValue(mocks);
  mocks.in.mockReturnValue(mocks);
});

describe('import batch status payload', () => {
  it('does not select or return documents while preserving item progress', async () => {
    const row = {
      id: 'item-1', batch_id: 'batch-1', url: 'https://example.com',
      status: 'completed', review_status: 'pending', accepted_event_id: null,
      saved_draft_id: null, reviewed_at: null, race_count: 1, error: null,
      created_at: '2026-11-01', updated_at: '2026-11-01',
      result: { markdown: 'x'.repeat(500_000), rawModelOutput: 'y'.repeat(500_000) },
    };
    mocks.order.mockResolvedValue({ data: [row], error: null });

    const items = await getBatchItems('batch-1');

    expect(mocks.select.mock.calls[0][0].split(', ')).not.toContain('result');
    expect(items[0]).toMatchObject({ id: 'item-1', status: 'completed', raceCount: 1 });
    expect(items[0]).not.toHaveProperty('markdown');
    expect(items[0]).not.toHaveProperty('rawModelOutput');
    expect(JSON.stringify(items).length).toBeLessThan(JSON.stringify(row).length / 100);
  });
});

describe('getItemArtifacts', () => {
  it('selects only the requested documents and permits failed items', async () => {
    const artifacts = { markdown: '# Failed crawl', rawModelOutput: null };
    mocks.maybeSingle.mockResolvedValue({ data: artifacts, error: null });

    await expect(getItemArtifacts('item-1')).resolves.toEqual(artifacts);

    expect(mocks.select).toHaveBeenCalledWith('markdown:result->>markdown, rawModelOutput:result->>rawModelOutput');
    expect(mocks.eq).toHaveBeenCalledWith('id', 'item-1');
    expect(mocks.in).toHaveBeenCalledWith('status', ['completed', 'failed']);
  });

  it('returns null for missing or non-terminal items', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getItemArtifacts('item-1')).resolves.toBeNull();
  });
});
