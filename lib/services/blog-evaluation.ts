import { inspect } from '@/lib/blog/scoring/rules';
import { combine, parseResult } from '@/lib/blog/scoring/result';
import { evaluateArticle } from '@/lib/integrations/openai/article-evaluation';
import type { DraftDetail } from '@/types/blog-draft-record.types';
import type { Evaluation, ScoringInput } from '@/types/blog-evaluation.types';

export function scoringInput(draft: DraftDetail): ScoringInput {
  return {
    generationContext: draft.generationContext, instructions:draft.instructions,title:draft.title ?? '',contentHtml:draft.contentHtml ?? '',
    primaryKeyword:draft.primaryKeyword ?? '',slug:draft.slug ?? '',seoTitle:draft.seoTitle ?? '',
    metaDescription:draft.metaDescription ?? '',
  };
}
export async function evaluate(input: ScoringInput): Promise<Evaluation> {
  const checks = inspect(input);
  const response = await evaluateArticle(input, checks);
  return combine(checks, parseResult(response, input, checks));
}
