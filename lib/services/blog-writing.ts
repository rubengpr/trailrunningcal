import { getRecentIntroductions } from '@/lib/content/blog-introductions';
import { prepare } from '@/lib/blog/writing/context';
import { compose } from '@/lib/blog/writing/result';
import { writeArticle } from '@/lib/integrations/openai/article-writing';
import type {
  WritingObserver,
  WritingResult,
} from '@/types/blog-writing.types';

// A single logical inference. Invalid context fails before constructing the provider client.
export async function write(
  value: unknown,
  record?: WritingObserver,
): Promise<WritingResult> {
  const { request, input: preparedInput } = prepare(value);
  const input = { ...preparedInput, recentIntroductions: getRecentIntroductions() };
  const started = Date.now();
  const result = await writeArticle(input, record);
  return {
    ...compose(result.value, request, input),
    model: result.model,
    responseId: result.responseId,
    durationMs: Date.now() - started,
    usage: result.usage
      ? {
          inputTokens: result.usage.input_tokens,
          outputTokens: result.usage.output_tokens,
          reasoningTokens:
            result.usage.output_tokens_details?.reasoning_tokens ?? 0,
        }
      : null,
  };
}
