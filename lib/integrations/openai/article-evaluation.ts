import { createOpenAIClient } from '@/lib/integrations/openai/client';
import { articleEvaluationInstructions } from '@/lib/blog/prompts/article-evaluation';
import { evaluationSchema } from '@/lib/blog/scoring/schema';
import { EvaluationError } from '@/lib/blog/scoring/result';
import type { DeterministicResult, ScoringInput } from '@/types/blog-evaluation.types';

export async function evaluateArticle(input: ScoringInput, checks: DeterministicResult): Promise<unknown> {
  try {
    const metadata = {
      instructions:input.instructions,title:input.title,primaryKeyword:input.primaryKeyword,
      slug:input.slug,seoTitle:input.seoTitle,metaDescription:input.metaDescription,
    };
    const metrics = {
      headings:checks.metrics.headings,words:checks.metrics.words,
      lengths:checks.metrics.lengths,keywordPresent:checks.metrics.keywordPresent,
    };
    const response = await createOpenAIClient().responses.create({
      model:'gpt-6.1-sol',reasoning:{effort:'medium'},max_output_tokens:4000,
      instructions:articleEvaluationInstructions,
      input:JSON.stringify({ ...metadata, article:checks.metrics.text, checks:{...checks,metrics} }),
      text:{format:{type:'json_schema',name:'blog_evaluation',strict:true,schema:evaluationSchema}},
    }, {timeout:120_000,maxRetries:2});
    if (response.output.some(item => item.type === 'message' && item.content.some(part => part.type === 'refusal'))) throw new EvaluationError('refused');
    if (response.status !== 'completed') throw new EvaluationError('incomplete');
    try { return JSON.parse(response.output_text) as unknown; } catch { throw new EvaluationError('invalid_evaluation'); }
  } catch (error) {
    if (error instanceof EvaluationError) throw error;
    throw new EvaluationError(error instanceof Error && /timeout|abort/i.test(error.name) ? 'timeout' : 'api_error');
  }
}
