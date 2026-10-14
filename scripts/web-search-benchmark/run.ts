import { readFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { initDataset, initExperiment, loadPrompt, flush } from 'braintrust';
import type { Experiment } from 'braintrust';
import {
  providers,
  settings,
  profiles,
  rates,
  keyNames,
} from '@/lib/web-search-benchmark/config';
import {
  hash,
  plan,
  costs,
  object,
  list,
  text,
} from '@/lib/web-search-benchmark/utils';
import { save, load, lock } from '@/lib/web-search-benchmark/state';
import { execute } from '@/lib/web-search-benchmark/execute';
import { research } from '@/lib/web-search-benchmark/research';
import type { Prompt } from '@/lib/web-search-benchmark/research';
import { judge } from '@/lib/web-search-benchmark/judge';
import { createClient } from '@/lib/integrations/openai/benchmark-client';
import { createAdapter } from '@/lib/web-search-benchmark/adapters';
import { attach, logEvent } from '@/lib/web-search-benchmark/trace';
import { evaluateReport, weights } from '@/lib/web-search-benchmark/scoring';
import type {
  Checkpoint,
  DatasetRow,
  Provider,
} from '@/types/web-search-benchmark.types';

// One cheap call per connection, through the same adapters and pins the benchmark uses.
async function ping(
  selected: Provider[],
  manifest: {
    project: string;
    dataset: { name: string; version: string };
    functions: { slug: string; version: string }[];
    judgeVersionPinnedInScorer: string;
  },
) {
  const check = async (run: () => Promise<Record<string, unknown>>) => {
    try {
      return { ok: true, ...(await run()) };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed',
      };
    }
  };
  const results: Record<string, unknown> = {};
  results.openai = await check(async () => {
    const response = await createClient(async () => {})(
      {
        model: settings.model,
        reasoning: { effort: 'low' },
        max_output_tokens: 200,
        store: false,
        input: 'Responde solo: OK',
      },
      AbortSignal.timeout(60_000),
    );
    return { status: response.status, output: response.output_text.trim() };
  });
  for (const provider of selected.filter((p) => p !== 'openai'))
    results[provider] = await check(async () => {
      const found = await createAdapter(
        provider as Exclude<Provider, 'openai'>,
        async () => {},
      ).search('Salomon Ultra Pirineu Bagà', AbortSignal.timeout(60_000));
      if (!found.sources.some((s) => s.content))
        throw new Error('No source with content');
      return {
        sources: found.sources.length,
        withContent: found.sources.filter((s) => s.content).length,
        errors: found.errors.length,
        usd: found.charge.usd,
      };
    });
  results.braintrust = await check(async () => {
    const researcher = manifest.functions.find(
      (f) => f.slug === 'event-researcher-v1',
    )!;
    for (const [slug, version] of [
      [researcher.slug, researcher.version],
      ['dossier-judge-v1', manifest.judgeVersionPinnedInScorer],
    ])
      await loadPrompt({
        projectName: manifest.project,
        slug,
        version,
        noTrace: true,
      });
    const dataset = initDataset(manifest.project, {
      dataset: manifest.dataset.name,
      version: manifest.dataset.version,
    });
    const rows = await dataset.fetchedData();
    return { promptsLoaded: 2, datasetRows: rows.length };
  });
  return results;
}

async function main() {
  const { values } = parseArgs({
    options: {
      mode: { type: 'string', default: 'plan' },
      execute: { type: 'boolean', default: false },
      'run-id': { type: 'string' },
      resume: { type: 'boolean', default: false },
      event: { type: 'string' },
      providers: { type: 'string' },
    },
  });
  if (
    !['plan', 'check-env', 'ping', 'smoke', 'benchmark'].includes(values.mode!)
  )
    throw new Error('Unknown mode');
  const selected = (values.providers?.split(',') ?? [
    ...providers,
  ]) as Provider[];
  if (
    !selected.length ||
    new Set(selected).size !== selected.length ||
    selected.some((p) => !providers.includes(p))
  )
    throw new Error('Invalid providers');
  const manifest = JSON.parse(
    await readFile(
      resolve('scripts/web-search-benchmark/manifest.json'),
      'utf8',
    ),
  );
  const raw = await readFile(
    resolve('scripts/web-search-benchmark/dataset.jsonl'),
    'utf8',
  );
  if (hash(raw) !== manifest.dataset.sha256)
    throw new Error('Frozen dataset hash mismatch');
  const rows = raw
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as DatasetRow);
  if (rows.length !== 6 || new Set(rows.map((r) => r.id)).size !== 6)
    throw new Error('Expected six unique dataset entries');
  for (const row of rows)
    if (hash(row.expected.groundTruth) !== row.metadata.ground_truth_sha256)
      throw new Error(`Ground truth hash mismatch: ${row.id}`);
  const smoke = values.mode === 'smoke';
  if (!smoke && values.event)
    throw new Error('--event is only available in smoke mode');
  const subset = smoke
    ? rows.filter((r) => r.id === (values.event ?? rows[0].id))
    : rows;
  if (!subset.length) throw new Error('Unknown dataset event');
  const runId = values['run-id'] ?? 'v1';
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(runId)) throw new Error('Invalid run ID');
  if (smoke && runId === 'v1')
    throw new Error('Smoke requires a separate --run-id');
  const jobs = plan(
    subset.map((r) => r.id),
    selected,
    smoke ? 1 : settings.trials,
    settings.seed,
    runId,
  );
  const required = [
    ...new Set([
      'BRAINTRUST_API_KEY',
      'OPENAI_API_KEY',
      ...selected.flatMap((p) => keyNames[p]),
    ]),
  ];
  const credentials = Object.fromEntries(
    required.map((key) => [key, Boolean(process.env[key])]),
  );
  const config = {
    mode: values.mode,
    runId,
    settings,
    profiles,
    rates,
    dataset: manifest.dataset,
    functions: manifest.functions,
    judgeVersion: manifest.judgeVersionPinnedInScorer,
    jobs,
  };
  const fingerprint = hash(
    JSON.stringify({ ...config, mode: smoke ? 'smoke' : 'benchmark' }),
  );
  if (values.mode === 'plan' || values.mode === 'check-env') {
    console.log(
      JSON.stringify(
        {
          investigations: jobs.length,
          config,
          credentials,
          networkRequests: 0,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!values.execute)
    throw new Error(
      'Real calls require --execute; plan and check-env perform no network requests',
    );
  if (!manifest.providerProfilesConfirmed)
    throw new Error('Provider profiles not finalized');
  if (required.some((key) => !process.env[key]))
    throw new Error('Missing credentials; run --mode check-env');
  if (values.mode === 'ping') {
    console.log(JSON.stringify(await ping(selected, manifest), null, 2));
    return;
  }
  const directory = resolve(
    'scripts/.cache/web-search-benchmark',
    `${smoke ? 'smoke' : 'benchmark'}-${runId}`,
  );
  await mkdir(join(directory, 'jobs'), { recursive: true });
  const release = await lock(directory);
  try {
    const existing = await readFile(join(directory, 'run.json'), 'utf8').catch(
      () => null,
    );
    if (existing && !values.resume)
      throw new Error(
        'Run exists; use --resume to continue without repeating finished requests',
      );
    if (existing && JSON.parse(existing).fingerprint !== fingerprint)
      throw new Error('Resume configuration mismatch');
    await save(join(directory, 'run.json'), { ...config, fingerprint });
    const dataset = initDataset(manifest.project, {
      dataset: manifest.dataset.name,
      version: manifest.dataset.version,
      useOutput: false,
    });
    if ((await dataset.id) !== manifest.dataset.id)
      throw new Error('Remote dataset identity mismatch');
    const remote = await dataset.fetchedData();
    if (remote.length !== rows.length)
      throw new Error('Remote dataset size mismatch');
    const ids = new Map<string, string>();
    for (const row of rows) {
      const match = remote.find(
        (r) =>
          object(r.input).eventName === row.input.eventName &&
          object(r.input).regionName === row.input.regionName,
      );
      if (
        !match ||
        object(match.expected).groundTruth !== row.expected.groundTruth ||
        JSON.stringify(object(match.expected).sources) !==
          JSON.stringify(row.expected.sources)
      )
        throw new Error(`Remote dataset differs: ${row.id}`);
      ids.set(row.id, match.id);
    }
    async function prompt(slug: string): Promise<Prompt> {
      const version =
        slug === 'dossier-judge-v1'
          ? manifest.judgeVersionPinnedInScorer
          : manifest.functions.find((f: { slug: string }) => f.slug === slug)
              ?.version;
      if (!version) throw new Error('Missing pinned prompt version');
      const loaded = await loadPrompt({
        projectName: manifest.project,
        slug,
        version,
        noTrace: true,
      });
      const built = object(
        loaded.build({
          eventName: '',
          regionName: '',
          input: '',
          output: '',
          expected: '',
        }),
      );
      if (built.model !== settings.model)
        throw new Error('Pinned model differs from configured model');
      const instructions = list(built.messages)
        .map(object)
        .filter((m) => m.role === 'system')
        .map((m) => text(m.content))
        .join('\n');
      const schema = object(
        object(object(built.response_format).json_schema).schema,
      );
      if (!instructions || !Object.keys(schema).length)
        throw new Error('Invalid pinned prompt');
      return { instructions, schema };
    }
    const [researchPrompt, judgePrompt] = await Promise.all([
      prompt('event-researcher-v1'),
      prompt('dossier-judge-v1'),
    ]);
    const experiments = new Map<Provider, Experiment>();
    for (const provider of selected) {
      const name = smoke ? `smoke-${runId}-${provider}` : `v1-${provider}`;
      const experiment = initExperiment(manifest.project, {
        experiment: name,
        update: true,
        setCurrent: false,
        dataset,
        metadata: { fingerprint, run_id: runId, profiles, settings, smoke },
      });
      const id = await experiment.id;
      if (
        !smoke &&
        id !==
          manifest.experiments.find((e: { name: string }) => e.name === name)
            ?.id
      )
        throw new Error('Experiment identity mismatch');
      // Never mix different run IDs/configurations into the fixed baseline containers.
      const logged = await experiment.fetchedData();
      if (
        logged.some(
          (r) =>
            r.metadata?.fingerprint && r.metadata.fingerprint !== fingerprint,
        )
      )
        throw new Error(
          'Experiment already contains a different configuration',
        );
      experiments.set(provider, experiment);
    }
    const cancel = new AbortController();
    const interrupt = () => cancel.abort();
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    let next = 0;
    const results: Checkpoint[] = [];
    try {
      const settled = await Promise.allSettled(
        Array.from({ length: settings.concurrency }, async () => {
          while (next < jobs.length && !cancel.signal.aborted) {
            const job = jobs[next++];
            const path = join(directory, 'jobs', `${job.id}.json`);
            const previous = await load(path);
            if (previous && previous.fingerprint !== fingerprint)
              throw new Error('Checkpoint configuration mismatch');
            const checkpoint: Checkpoint = previous ?? {
              job,
              fingerprint,
              stage: 'prepared',
              events: [],
              judgeEvents: [],
              rootSpanId: job.id,
            };
            const row = rows.find((r) => r.id === job.rowId)!;
            const signal = cancel.signal;
            await execute(checkpoint, path, {
              research: (record) =>
                research({
                  provider: job.provider,
                  input: row.input,
                  prompt: researchPrompt,
                  complete: createClient(record),
                  record,
                  signal,
                  ...(job.provider === 'openai'
                    ? {}
                    : { adapter: createAdapter(job.provider, record) }),
                }),
              evaluate: async (result, record) =>
                (
                  await judge(
                    row,
                    result,
                    judgePrompt,
                    createClient(record),
                    signal,
                  )
                ).report,
            });
            const root = experiments.get(job.provider)!.startSpan({
              name: 'investigation',
              type: 'task',
              spanId: checkpoint.rootSpanId,
              event: {
                id: job.id,
                input: row.input,
                expected: row.expected,
                datasetRecordId: ids.get(row.id),
                metadata: {
                  fingerprint,
                  ...job,
                  profiles: profiles[job.provider],
                  settings,
                  dataset: manifest.dataset,
                  functions: manifest.functions,
                  judge_version: manifest.judgeVersionPinnedInScorer,
                },
              },
            });
            try {
              checkpoint.events.forEach((event, index) =>
                logEvent(root, event, index, 'research'),
              );
              checkpoint.judgeEvents.forEach((event, index) =>
                logEvent(root, event, index, 'evaluation'),
              );
              const score =
                checkpoint.report && checkpoint.result
                  ? evaluateReport(
                      checkpoint.report,
                      checkpoint.result.dossier,
                      row.expected.groundTruth,
                    )
                  : null;
              root.log({
                output: attach(
                  { dossier: checkpoint.result?.dossier, report: score },
                  'result',
                ),
                metadata: {
                  stage: checkpoint.stage,
                  error: checkpoint.error,
                  research_cost: costs(checkpoint.events),
                  judge_cost: costs(checkpoint.judgeEvents),
                },
                ...(score
                  ? {
                      scores: {
                        publishable: score.publishable ? 1 : 0,
                        // Discarded dossiers get no quality score, not a zero.
                        quality:
                          score.quality === null ? null : score.quality / 100,
                        ...Object.fromEntries(
                          Object.entries(score.points).map(([key, value]) => [
                            key,
                            score.publishable
                              ? value / weights[key as keyof typeof weights]
                              : null,
                          ]),
                        ),
                      },
                    }
                  : {}),
                ...(checkpoint.error ? { error: checkpoint.error } : {}),
              });
            } finally {
              root.end();
            }
            results.push(checkpoint);
            console.log(
              `${job.provider} ${job.rowId} #${job.trial}: ${checkpoint.stage}`,
            );
          }
        }).map((worker) =>
          worker.catch((error) => {
            cancel.abort();
            throw error;
          }),
        ),
      );
      const failure = settled.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    } finally {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
      await flush();
    }
    const summary = selected.map((provider) => {
      const subset = results.filter((r) => r.job.provider === provider);
      const evaluated = subset.flatMap((r) =>
        r.report && r.result
          ? [
              evaluateReport(
                r.report,
                r.result.dossier,
                rows.find((row) => row.id === r.job.rowId)!.expected
                  .groundTruth,
              ),
            ]
          : [],
      );
      const scores = evaluated.flatMap((e) =>
        e.quality === null ? [] : [e.quality],
      );
      const mean = scores.length
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;
      const publishableRate = evaluated.length
        ? scores.length / evaluated.length
        : null;
      return {
        provider,
        attempted: subset.length,
        completed: evaluated.length,
        publishable: scores.length,
        publishableRate,
        expectedQuality:
          mean === null || publishableRate === null
            ? null
            : mean * publishableRate,
        failed: subset.filter((r) => r.stage === 'failed').length,
        interrupted: subset.filter((r) => r.stage === 'interrupted').length,
        qualityMean: mean,
        qualityStdDev:
          mean === null
            ? null
            : Math.sqrt(
                scores.reduce((a, s) => a + (s - mean) ** 2, 0) / scores.length,
              ),
        researchCost: costs(subset.flatMap((r) => r.events)),
        judgeCost: costs(subset.flatMap((r) => r.judgeEvents)),
      };
    });
    await save(join(directory, 'summary.json'), {
      summary,
      planned: jobs.length,
      processed: results.length,
    });
    // Braintrust indexes rows shortly after flush; poll before declaring roots missing.
    for (const [provider, experiment] of experiments) {
      const expected = results
        .filter((r) => r.job.provider === provider)
        .map((r) => r.job.id);
      for (let attempt = 1; ; attempt++) {
        experiment.clearCache();
        const logged = await experiment.fetchedData();
        const ids = new Set(
          logged.filter((r) => r.span_id === r.root_span_id).map((r) => r.id),
        );
        if (expected.every((id) => ids.has(id))) break;
        if (attempt === 6)
          throw new Error(
            'Braintrust root verification failed; resume to synchronize local checkpoints',
          );
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    console.log(JSON.stringify(summary, null, 2));
    if (results.length !== jobs.length)
      throw new Error('Run interrupted; unfinished work preserved');
  } finally {
    await release();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Benchmark runner failed',
  );
  process.exitCode = 1;
});
