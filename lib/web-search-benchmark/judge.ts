import { settings } from '@/lib/web-search-benchmark/config';
import { evaluateReport } from '@/lib/web-search-benchmark/scoring';
import type { Complete } from '@/lib/integrations/openai/benchmark-client';
import type {
  DatasetRow,
  ResearchResult,
} from '@/types/web-search-benchmark.types';
import type { Prompt } from '@/lib/web-search-benchmark/research';

export async function judge(
  row: DatasetRow,
  result: ResearchResult,
  prompt: Prompt,
  complete: Complete,
  signal: AbortSignal,
) {
  // Whitelist fields: only the dossier reaches the judge — no evidence, provider, charges, or tool names.
  const payload = {
    input: row.input,
    output: { dossier: result.dossier },
    expected: row.expected,
  };
  const response = await complete(
    {
      model: settings.model,
      reasoning: { effort: settings.judgeReasoning },
      max_output_tokens: settings.judgeMaxOutputTokens,
      store: false,
      instructions: prompt.instructions,
      input: JSON.stringify(payload),
      text: {
        format: {
          type: 'json_schema',
          name: 'dossier_evaluation',
          strict: true,
          schema: prompt.schema,
        },
      },
    },
    signal,
  );
  if (response.status !== 'completed')
    throw new Error('Incomplete judge response');
  if (
    response.output.some(
      (item) =>
        item.type === 'message' &&
        item.content.some((c) => c.type === 'refusal'),
    )
  )
    throw new Error('Judge refusal');
  return evaluateReport(
    JSON.parse(response.output_text),
    result.dossier,
    row.expected.groundTruth,
  );
}
