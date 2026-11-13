import { createOpenAIClient } from '@/lib/integrations/openai/client';
import { articleEditingInstructions, editingVoiceExamples } from '@/lib/blog/prompts/article-editing';
import { schema } from '@/lib/blog/editing/result';
import { GenerationError } from '@/lib/blog/content';
import type { EditingInput } from '@/types/blog-editing.types';
import type { ResponseObserver } from '@/types/blog-cost.types';

export const editingOptions = {
  model: 'gpt-6.1-sol', effort: 'medium', maxOutputTokens: 16000,
  timeoutMs: 120_000, maxRetries: 2,
} as const;

export async function editArticle(input: EditingInput, record?: ResponseObserver) {
  try {
    const response = await createOpenAIClient().responses.create({
      model: editingOptions.model,
      reasoning: { effort: editingOptions.effort },
      max_output_tokens: editingOptions.maxOutputTokens,
      store: false,
      instructions: articleEditingInstructions,
      input: JSON.stringify({ ...input, voiceExamples: editingVoiceExamples }),
      text: { format: { type: 'json_schema', name: 'edited_article', strict: true, schema: schema(input) } },
    }, { timeout: editingOptions.timeoutMs, maxRetries: editingOptions.maxRetries });
    await record?.(response);
    if (response.output.some(item => item.type === 'message' && item.content.some(part => part.type === 'refusal'))) throw new GenerationError('refused');
    if (response.status !== 'completed') throw new GenerationError('incomplete');
    let value: unknown;
    try { value = JSON.parse(response.output_text); } catch { throw new GenerationError('invalid_content'); }
    return { value, model: response.model, responseId: response.id, usage: response.usage };
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(error instanceof Error && /timeout|abort/i.test(error.name) ? 'timeout' : 'api_error');
  }
}
