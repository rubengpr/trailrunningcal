import { Eval } from 'braintrust';
import { profiles, rates } from '@/lib/web-search-benchmark/config';

// Registration only. There are deliberately no test rows and no provider calls.
// A separate benchmark runner must attach the pinned dataset and execute real trials.
for (const provider of ['openai', 'exa', 'tavily', 'linkup', 'context-dev']) {
  Eval('Web Search Benchmark', {
    experimentName: `v1-${provider}`,
    description:
      'Prepared empty experiment. Planned: six events × three trials. No investigations executed.',
    data: [],
    task: () => {
      throw new Error('Preparation cannot execute investigations');
    },
    scores: [
      () => {
        throw new Error('Preparation cannot evaluate dossiers');
      },
    ],
    trialCount: 3,
    metadata: {
      status: 'prepared_not_executed',
      provider,
      planned_investigations: 18,
      dataset_id: 'f5f4781d-3c68-4263-843f-c7749bdb975e',
      dataset_version: '1000198032278487396',
      researcher_model: 'gpt-6.1-sol',
      researcher_reasoning: 'medium',
      judge_model: 'gpt-6.1-sol',
      judge_reasoning: 'medium',
      benchmark_version: 'v1',
      provider_profiles_confirmed: true,
      profiles,
      rates,
      researcher_slug: 'event-researcher-v1',
      judge_slug: 'dossier-judge-v1',
      scorer_slug: 'dossier-quality-v1',
      random_order_seed: 20261014,
      decision_metrics: ['quality', 'cost'],
    },
  });
}
