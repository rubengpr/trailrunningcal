import { createOpenAIClient } from '@/lib/integrations/openai/client';
import { articleWritingInstructions } from '@/lib/blog/prompts/article-writing';
import { writingSchema } from '@/lib/blog/writing/schema';
import { GenerationError } from '@/lib/blog/content';
import type { WritingInput, WritingObserver } from '@/types/blog-writing.types';

export const writingOptions = {
  model: 'gpt-6.1-sol',
  effort: 'medium',
  maxOutputTokens: 8000,
  timeoutMs: 120_000,
  maxRetries: 2,
} as const;

export async function writeArticle(
  input: WritingInput,
  record?: WritingObserver,
) {
  try {
    const response = await createOpenAIClient().responses.create(
      {
        model: writingOptions.model,
        reasoning: { effort: writingOptions.effort },
        max_output_tokens: writingOptions.maxOutputTokens,
        store: false,
        instructions: articleWritingInstructions,
        input: JSON.stringify(input),
        text: {
          format: {
            type: 'json_schema',
            name: 'researched_article',
            strict: true,
            schema: writingSchema(input),
          },
        },
      },
      {
        timeout: writingOptions.timeoutMs,
        maxRetries: writingOptions.maxRetries,
      },
    );
    await record?.(response);
    if (
      response.output.some(
        (item) =>
          item.type === 'message' &&
          item.content.some((part) => part.type === 'refusal'),
      )
    )
      throw new GenerationError('refused');
    if (response.status !== 'completed')
      throw new GenerationError('incomplete');
    let value: unknown;
    try {
      value = JSON.parse(response.output_text);
    } catch {
      throw new GenerationError('invalid_content');
    }
    return {
      value,
      responseId: response.id,
      model: response.model,
      usage: response.usage,
    };
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(
      error instanceof Error && /timeout|abort/i.test(error.name)
        ? 'timeout'
        : 'api_error',
    );
  }
}
