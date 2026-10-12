import { createOpenAIClient } from '@/lib/integrations/openai/client';
import { articleGenerationInstructions } from '@/lib/blog/prompts/article-generation';
import { articleSchema } from '@/lib/blog/article-schema';
import { GenerationError } from '@/lib/blog/content';

export async function generateArticle(instructions: string) {
  const client = createOpenAIClient();
  try {
    const response = await client.responses.create({
      model: 'gpt-6.1-sol',
      reasoning: { effort: 'medium' },
      max_output_tokens: 8000,
      instructions: articleGenerationInstructions,
      input: instructions,
      text: { format: { type: 'json_schema', name: 'blog_article', strict: true, schema: articleSchema } },
    }, { timeout: 120_000, maxRetries: 2 });
    if (response.output.some(item => item.type === 'message' && item.content.some(part => part.type === 'refusal'))) {
      throw new GenerationError('refused');
    }
    if (response.status !== 'completed') throw new GenerationError('incomplete');
    let value: unknown;
    try { value = JSON.parse(response.output_text); } catch { throw new GenerationError('invalid_content'); }
    return { value, responseId: response.id, model: response.model, usage: response.usage };
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(error instanceof Error && /timeout|abort/i.test(error.name) ? 'timeout' : 'api_error');
  }
}
