import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ select: vi.fn(), result: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: () => ({ select: mocks.select }) }),
}));

import { getBatchItems, getItemArtifacts, getPendingBatchItems } from './event-import-batches';

beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    eq: vi.fn(),
    in: vi.fn(),
    order: mocks.result,
    maybeSingle: mocks.result,
  };
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  mocks.select.mockReturnValue(query);
});

describe('import status payloads', () => {
  it.each([getBatchItems, getPendingBatchItems])('%s excludes artifacts from queries and responses', async (read) => {
    const row = {
      id: 'item-1',
      batch_id: 'batch-1',
      status: 'completed',
      accepted_event_id: null,
      result: { markdown: 'x'.repeat(100_000), rawModelOutput: 'y'.repeat(100_000) },
    };
    mocks.result.mockResolvedValue({ data: [row], error: null });

    const items = await read('batch-1');

    expect(mocks.select).toHaveBeenCalledWith(expect.not.stringContaining('result'));
    expect(items[0]).not.toHaveProperty('markdown');
    expect(items[0]).not.toHaveProperty('rawModelOutput');
    expect(JSON.stringify(items).length).toBeLessThan(1000);
  });
});

describe('getItemArtifacts', () => {
  it('returns only stored markdown and raw output, including partial failed results', async () => {
    mocks.result.mockResolvedValue({ data: { markdown: '# Failed crawl', raw_model_output: null }, error: null });

    await expect(getItemArtifacts('item-1')).resolves.toEqual({
      markdown: '# Failed crawl', rawModelOutput: null,
    });
    expect(mocks.select).toHaveBeenCalledWith('markdown:result->>markdown, raw_model_output:result->>rawModelOutput');
    const query = mocks.select.mock.results[0].value;
    expect(query.eq).toHaveBeenCalledWith('id', 'item-1');
    expect(query.in).toHaveBeenCalledWith('status', ['completed', 'failed']);
  });

  it('returns null for missing or unfinished items', async () => {
    mocks.result.mockResolvedValue({ data: null, error: null });

    await expect(getItemArtifacts('missing')).resolves.toBeNull();
  });

  it('propagates database failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.result.mockResolvedValue({ data: null, error: { message: 'offline' } });

    await expect(getItemArtifacts('item-1')).rejects.toThrow('Failed to fetch event import item artifacts');
  });
});
