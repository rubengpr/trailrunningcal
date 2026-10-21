import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prepare } from '@/lib/blog/writing/context';
import { articleWritingInstructions } from '@/lib/blog/prompts/article-writing';
import { writingRequest, writingResponse } from '@/tests/fixtures/blog-writing';

const mocks = vi.hoisted(() => ({ create: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/integrations/openai/client', () => ({
  createOpenAIClient: mocks.client,
}));
import { write } from '@/lib/services/blog-writing';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.mockReturnValue({ responses: { create: mocks.create } });
  mocks.create.mockResolvedValue({
    id: 'response',
    model: 'gpt-6.1-sol',
    status: 'completed',
    output: [],
    output_text: JSON.stringify(writingResponse),
    usage: {
      input_tokens: 1000,
      output_tokens: 500,
      output_tokens_details: { reasoning_tokens: 100 },
    },
  });
});
describe('researched article inference', () => {
  it('makes one call with stable instructions, data-only input, strict output and no tools', async () => {
    const result = await write(writingRequest);
    expect(mocks.create).toHaveBeenCalledOnce();
    const [body, options] = mocks.create.mock.calls[0];
    expect(body.instructions).toBe(articleWritingInstructions);
    expect(body.instructions).not.toContain('Cataluña');
    expect(JSON.parse(body.input)).toEqual(prepare(writingRequest).input);
    expect(body.model).toBe('gpt-6.1-sol');
    expect(body.reasoning).toEqual({ effort: 'medium' });
    expect(body.tools).toBeUndefined();
    expect(body.max_output_tokens).toBe(8000);
    expect(body.text.format.strict).toBe(true);
    expect(body.text.format.schema.required).toHaveLength(7);
    expect(options).toEqual({ timeout: 120000, maxRetries: 2 });
    expect(result.usage).toEqual({
      inputTokens: 1000,
      outputTokens: 500,
      reasoningTokens: 100,
    });
    expect(result.references).toHaveLength(5);
  });
  it('rejects missing dossiers before constructing the client', async () => {
    await expect(
      write({ ...writingRequest, events: [] }),
    ).rejects.toMatchObject({ code: 'invalid_context' });
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([
    [
      {
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'refusal' }] }],
        output_text: '',
      },
      'refused',
    ],
    [{ status: 'incomplete', output: [], output_text: '{}' }, 'incomplete'],
    [{ status: 'completed', output: [], output_text: '{' }, 'invalid_content'],
    [{ status: 'completed', output: [], output_text: '{}' }, 'invalid_content'],
  ])(
    'does not repair refused, incomplete or invalid output %#',
    async (response, code) => {
      mocks.create.mockResolvedValue(response);
      await expect(write(writingRequest)).rejects.toMatchObject({ code });
      expect(mocks.create).toHaveBeenCalledOnce();
    },
  );
  it('keeps safe error codes and does not retry in application code', async () => {
    mocks.create.mockRejectedValue(new Error('Private provider details'));
    await expect(write(writingRequest)).rejects.toMatchObject({
      code: 'api_error',
      message: 'api_error',
    });
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it('preserves the original response for review even when validation fails', async () => {
    const response = {
      id: 'invalid-response',
      status: 'incomplete',
      output: [],
      output_text: '{',
    };
    mocks.create.mockResolvedValue(response);
    const record = vi.fn().mockResolvedValue(undefined);
    await expect(write(writingRequest, record)).rejects.toMatchObject({
      code: 'incomplete',
    });
    expect(record).toHaveBeenCalledWith(response);
    expect(mocks.create).toHaveBeenCalledOnce();
  });
});
