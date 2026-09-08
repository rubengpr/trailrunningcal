import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractFromImages: vi.fn(),
  extractFromMarkdown: vi.fn(),
}));

vi.mock('@/lib/integrations/openrouter/service', () => ({
  extractFromImages: mocks.extractFromImages,
  extractFromMarkdown: mocks.extractFromMarkdown,
}));

import { extractEvent } from './event-extraction';

const result = {
  event: { name: 'Trail Running Cal' },
  races: [{ name: '20K' }],
  errorMessage: null,
  rawModelOutput: 'model output',
  usage: { promptTokens: 100, completionTokens: 20 },
};

describe('extractEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates markdown extraction and shapes its API result', async () => {
    mocks.extractFromMarkdown.mockResolvedValue(result);

    await expect(extractEvent({
      mode: 'markdown',
      markdown: '# Event',
      model: 'openai/gpt-5.4-mini',
    })).resolves.toEqual({
      ...result,
      pageStats: { total: 0, successCount: 0, errorCount: 0 },
    });
    expect(mocks.extractFromMarkdown).toHaveBeenCalledWith(
      '# Event',
      'openai/gpt-5.4-mini',
    );
    expect(mocks.extractFromImages).not.toHaveBeenCalled();
  });

  it('delegates image extraction', async () => {
    mocks.extractFromImages.mockResolvedValue(result);

    await extractEvent({
      mode: 'images',
      images: ['data:image/png;base64,image'],
      model: 'openai/gpt-5.4-mini',
    });

    expect(mocks.extractFromImages).toHaveBeenCalledWith(
      ['data:image/png;base64,image'],
      'openai/gpt-5.4-mini',
    );
    expect(mocks.extractFromMarkdown).not.toHaveBeenCalled();
  });
});
