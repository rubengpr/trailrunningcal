import { apply, prepare } from '@/lib/blog/editing/result';
import { editArticle } from '@/lib/integrations/openai/article-editing';
import type { EditingRequest } from '@/types/blog-editing.types';
import type { ResponseObserver } from '@/types/blog-cost.types';
import type { WritingResult } from '@/types/blog-writing.types';

export async function edit(request: EditingRequest, record?: ResponseObserver): Promise<WritingResult> {
  const input = prepare(request);
  const started = Date.now();
  const result = await editArticle(input, record);
  return {
    ...apply(result.value, request, input),
    model: result.model,
    responseId: result.responseId,
    durationMs: Date.now() - started,
    usage: result.usage ? {
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
      reasoningTokens: result.usage.output_tokens_details?.reasoning_tokens ?? 0,
    } : null,
  };
}
