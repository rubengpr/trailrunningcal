import { composeSelection } from '@/lib/blog/selection-content';
import type { SelectionContext } from '@/types/blog-selection.types';
import { generateArticle } from '@/lib/integrations/openai/article-generation';
import { parseArticle, renderContent } from '@/lib/blog/content';
import type { GeneratedArticle } from '@/types/blog-article.types';
import type { ResponseObserver } from '@/types/blog-cost.types';

export async function generate(instructions: string, context?: SelectionContext | null, observe?: ResponseObserver): Promise<GeneratedArticle> {
  const started = Date.now();
  const result = await generateArticle(instructions, context, observe);
  const composed = context ? composeSelection(result.value, context) : null;
  const article = composed?.article ?? parseArticle(result.value);
  return {
    article, contentHtml: composed?.contentHtml ?? renderContent(article.contentMarkdown), model: result.model,
    responseId: result.responseId, durationMs: Date.now() - started,
    usage: result.usage ? {
      inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens,
      reasoningTokens: result.usage.output_tokens_details.reasoning_tokens,
    } : null,
  };
}
