import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENT_IMPORT_DRAFTS_PAGE_SIZE } from '@/lib/event-import/draft-pagination';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));

import { getEventImportDraftsPage } from './event-import-drafts';

const input = { page: 2, search: 'ultra', draftId: null };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getEventImportDraftsPage', () => {
  it('returns a bounded page in index order with latest publications', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        draft_ids: ['draft-2', 'draft-1'],
        total_count: 52,
        publications: [{
          id: 'job-2',
          draft_id: 'draft-2',
          status: 'failed',
          error: 'translation failed',
        }],
      }],
      error: null,
    });
    const rows = [
      {
        id: 'draft-1', source_url: null, batch_item_id: null,
        research_batch_item_id: null, status: 'draft', accepted_event_id: null,
        data: { event: { name: 'First' }, races: [] },
        created_at: '2026-09-01', updated_at: '2026-09-01',
      },
      {
        id: 'draft-2', source_url: 'https://example.com', batch_item_id: null,
        research_batch_item_id: null, status: 'draft', accepted_event_id: null,
        data: { event: { name: 'Second' }, races: [] },
        created_at: '2026-09-02', updated_at: '2026-09-02',
      },
    ];
    const inIds = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn().mockReturnValue({ in: inIds });
    mocks.from.mockReturnValue({ select });

    const result = await getEventImportDraftsPage(input);

    expect(mocks.rpc).toHaveBeenCalledWith('get_event_import_drafts_page', {
      p_limit: EVENT_IMPORT_DRAFTS_PAGE_SIZE,
      p_offset: EVENT_IMPORT_DRAFTS_PAGE_SIZE,
      p_search: 'ultra',
      p_draft_id: null,
    });
    expect(inIds).toHaveBeenCalledWith('id', ['draft-2', 'draft-1']);
    expect(result).toMatchObject({ page: 2, total: 52, totalPages: 2 });
    expect(result.drafts.map((draft) => draft.id)).toEqual(['draft-2', 'draft-1']);
    expect(result.drafts[0]?.publication).toEqual({
      jobId: 'job-2',
      status: 'failed',
      error: 'translation failed',
    });
  });

  it('does not issue a detail query for an empty page', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ draft_ids: [], total_count: 0, publications: [] }],
      error: null,
    });

    await expect(getEventImportDraftsPage({
      page: 1,
      search: '',
      draftId: null,
    })).resolves.toEqual({
      drafts: [],
      page: 1,
      pageSize: EVENT_IMPORT_DRAFTS_PAGE_SIZE,
      total: 0,
      totalPages: 0,
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
