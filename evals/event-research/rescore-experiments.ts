import { init } from 'braintrust';

import { PROJECT_NAME } from './config';
import {
  description,
  event_name,
  gpx_download_url,
  json_schema,
  negative_case,
  overall,
  races,
  race_tiers,
} from './scorers';
import type {
  EventResearchInput,
  EventResearchMetadata,
  EventResearchResult,
} from './types';

const PROJECT_ID = 'b03778f4-e0f1-4f7a-892e-54dcbae67cc7';
const RESCORE_VERSION = 'v3';
const EXPERIMENT_PREFIX = 'event-research-';
const RESCORE_PREFIX = `event-research-rescore-${RESCORE_VERSION}-`;

interface ExperimentSummary {
  id: string;
  name: string;
  deleted_at: string | null;
  metadata: Record<string, unknown> | null;
}

interface HistoricalSpan {
  root_span_id?: string;
  span_attributes?: {
    type?: string;
  };
  input?: unknown;
}

interface HistoricalCase {
  input: EventResearchInput;
  output: EventResearchResult;
  expected: unknown;
  metadata: EventResearchMetadata;
}

function apiUrl(): string {
  return process.env.BRAINTRUST_API_URL ?? 'https://api-eu.braintrust.dev';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEventResearchInput(value: unknown): value is EventResearchInput {
  return isRecord(value) && typeof value.eventName === 'string';
}

function isEventResearchResult(value: unknown): value is EventResearchResult {
  return isRecord(value) && 'result' in value && 'failure' in value && 'response' in value;
}

function isEventResearchMetadata(value: unknown): value is EventResearchMetadata {
  return isRecord(value) &&
    typeof value.datasetVersion === 'string' &&
    typeof value.inputMode === 'string' &&
    typeof value.verifiedAt === 'string' &&
    (value.caseType === 'valid-event' ||
      value.caseType === 'out-of-scope' ||
      value.caseType === 'not-found');
}

function rescoreName(sourceName: string): string {
  return `${RESCORE_PREFIX}${sourceName.slice(EXPERIMENT_PREFIX.length)}`;
}

async function listExperiments(): Promise<ExperimentSummary[]> {
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) throw new Error('BRAINTRUST_API_KEY is required.');

  const response = await fetch(`${apiUrl()}/v1/experiment?project_id=${PROJECT_ID}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`Could not list experiments (${response.status}).`);

  const body = (await response.json()) as { objects?: ExperimentSummary[] };
  return body.objects ?? [];
}

async function sourceCases(experimentName: string): Promise<HistoricalCase[]> {
  const source = init(PROJECT_NAME, { experiment: experimentName, open: true });
  const byRootSpan = new Map<string, HistoricalCase>();

  for await (const rawSpan of source) {
    const span = rawSpan as HistoricalSpan;
    if (span.span_attributes?.type !== 'score' || !isRecord(span.input)) continue;

    const { input, output, expected, metadata } = span.input;
    if (
      !isEventResearchInput(input) ||
      !isEventResearchResult(output) ||
      !isEventResearchMetadata(metadata)
    ) {
      continue;
    }

    const key = span.root_span_id ?? JSON.stringify(input);
    byRootSpan.set(key, { input, output, expected, metadata });
  }

  return [...byRootSpan.values()];
}

async function rescore(source: ExperimentSummary): Promise<number> {
  const cases = await sourceCases(source.name);
  if (cases.length === 0) {
    console.warn(`Skipping ${source.name}: no historical eval rows found.`);
    return 0;
  }

  const target = init(PROJECT_NAME, {
    experiment: rescoreName(source.name),
    description: `Local scorer ${RESCORE_VERSION} rescore of ${source.name}; no model or web-search calls.`,
    metadata: {
      rescoreVersion: RESCORE_VERSION,
      sourceExperimentId: source.id,
      sourceExperimentName: source.name,
      sourceExperimentMetadata: source.metadata,
      scorerNames: [
        'json_schema',
        'negative_case',
        'event_name',
        'races',
        'description',
        'race_tiers',
        'gpx_download_url',
        'overall',
      ],
    },
    tags: ['event-research', 'rescore', RESCORE_VERSION],
    setCurrent: false,
  });

  for (const testCase of cases) {
    const args = {
      output: testCase.output,
      expected: testCase.expected,
      metadata: testCase.metadata,
    };
    target.log({
      input: testCase.input,
      output: testCase.output,
      expected: testCase.expected,
      scores: {
        json_schema: json_schema(args),
        negative_case: negative_case(args),
        event_name: event_name(args),
        races: races(args),
        description: description(args),
        race_tiers: race_tiers(args),
        gpx_download_url: gpx_download_url(args),
        overall: overall(args),
      },
      metadata: {
        ...testCase.metadata,
        rescoreVersion: RESCORE_VERSION,
        sourceExperimentId: source.id,
        sourceExperimentName: source.name,
      },
    });
  }

  await target.flush();
  console.log(`Created ${rescoreName(source.name)} (${cases.length} rows).`);
  return cases.length;
}

async function main() {
  const experiments = await listExperiments();
  const existingNames = new Set(experiments.map((experiment) => experiment.name));
  const requestedSourceNames = new Set(process.argv.slice(2).filter((value) => value !== '--'));
  const sources = experiments.filter(
    (experiment) =>
      !experiment.deleted_at &&
      experiment.name.startsWith(EXPERIMENT_PREFIX) &&
      !experiment.name.startsWith(RESCORE_PREFIX) &&
      (requestedSourceNames.size === 0 || requestedSourceNames.has(experiment.name)),
  );

  if (requestedSourceNames.size > 0 && sources.length !== requestedSourceNames.size) {
    const foundNames = new Set(sources.map((source) => source.name));
    const missing = [...requestedSourceNames].filter((name) => !foundNames.has(name));
    throw new Error(`Requested experiment(s) not found: ${missing.join(', ')}`);
  }

  let created = 0;
  let rows = 0;
  for (const source of sources) {
    if (existingNames.has(rescoreName(source.name))) {
      console.log(`Skipping ${source.name}: ${rescoreName(source.name)} already exists.`);
      continue;
    }

    rows += await rescore(source);
    created += 1;
  }

  console.log(`Finished: ${created} rescore experiments, ${rows} rows.`);
}

void main();
