import { save, resumeAction } from '@/lib/web-search-benchmark/state';
import { sanitize } from '@/lib/web-search-benchmark/utils';
import type {
  Checkpoint,
  RecordEvent,
  ResearchResult,
  Report,
} from '@/types/web-search-benchmark.types';

// Persist before telemetry. Never reissue a call whose outcome was lost during interruption.
export async function execute(
  checkpoint: Checkpoint,
  path: string,
  dependencies: {
    research: (record: RecordEvent) => Promise<ResearchResult>;
    evaluate: (result: ResearchResult, record: RecordEvent) => Promise<Report>;
  },
) {
  const action = resumeAction(checkpoint);
  if (action === 'interrupted') {
    checkpoint.stage = 'interrupted';
    checkpoint.error =
      'Interrupted request; outcome unknown. Review before scheduling a separate execution.';
    await save(path, checkpoint);
    return checkpoint;
  }
  if (['completed', 'failed', 'interrupted'].includes(checkpoint.stage))
    return checkpoint;
  let phase: 'research' | 'evaluation' = 'research';
  const record =
    (target: 'events' | 'judgeEvents'): RecordEvent =>
    async (event) => {
      checkpoint[target].push(sanitize(event) as typeof event);
      await save(path, checkpoint);
    };
  try {
    if (!checkpoint.result) {
      checkpoint.stage = 'researching';
      await save(path, checkpoint);
      checkpoint.result = await dependencies.research(record('events'));
      checkpoint.stage = 'researched';
      await save(path, checkpoint);
    }
    phase = 'evaluation';
    checkpoint.stage = 'evaluating';
    await save(path, checkpoint);
    checkpoint.report = await dependencies.evaluate(
      checkpoint.result,
      record('judgeEvents'),
    );
    checkpoint.stage = 'completed';
  } catch {
    checkpoint.stage = 'failed';
    checkpoint.failurePhase = phase;
    checkpoint.error =
      phase === 'research'
        ? 'Research failed; inspect recorded responses'
        : 'Evaluation failed; research dossier preserved';
  }
  await save(path, checkpoint);
  return checkpoint;
}
