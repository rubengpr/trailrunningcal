import { execFileSync } from 'node:child_process';

import { Eval, initDataset } from 'braintrust';
import type { EvalCase } from 'braintrust';

import {
  DATASET_LABEL,
  DATASET_NAME,
  DATASET_VERSION,
  GROK_MODEL,
  MAX_CONCURRENCY,
  MISTRAL_MAX_CONCURRENCY,
  MISTRAL_MODEL,
  MODEL,
  OPENROUTER_MODEL,
  OPENROUTER_SEARCH_ENGINE,
  PROJECT_NAME,
  PROMPT_VERSION,
  REASONING_EFFORT,
  SEARCH_CONTEXT_SIZE,
  TERRA_MODEL,
} from './config';
import { createOpenAIProvider } from './openai-provider';
import { createOpenRouterProvider } from './openrouter-provider';
import { createMistralProvider } from './mistral-provider';
import { scorers } from './scorers';
import type {
  EventResearchInput,
  EventResearchMetadata,
  EventResearchResult,
} from './types';

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function gitRevision(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

const runMode = argument('run-mode', 'baseline');
const selectedProvider = argument('provider', 'openai');
const selectedEventName = argument('event-name', '').trim();
const inputEventName = argument('input-event-name', selectedEventName).trim();
const trialCount = Number.parseInt(argument('trials', '1'), 10);
if (!Number.isInteger(trialCount) || trialCount < 1) {
  throw new Error('The --trials argument must be a positive integer.');
}

const dataset = initDataset({
  project: PROJECT_NAME,
  dataset: DATASET_NAME,
  version: DATASET_VERSION,
});
if (!['openai', 'terra', 'openrouter', 'grok', 'mistral'].includes(selectedProvider)) {
  throw new Error(
    'The --provider argument must be openai, terra, openrouter, grok, or mistral.',
  );
}

const provider =
  selectedProvider === 'mistral'
    ? createMistralProvider()
    : selectedProvider === 'grok'
    ? createOpenRouterProvider(GROK_MODEL)
    : selectedProvider === 'openrouter'
      ? createOpenRouterProvider()
      : selectedProvider === 'terra'
        ? createOpenAIProvider(TERRA_MODEL)
        : createOpenAIProvider();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const evalData = dataset as unknown as AsyncIterable<
  EvalCase<EventResearchInput, unknown, EventResearchMetadata>
>;

async function* selectedDatasetRow() {
  for await (const row of evalData) {
    if (
      selectedEventName === '' ||
      row.input.eventName.localeCompare(selectedEventName, undefined, {
        sensitivity: 'base',
      }) === 0
    ) {
      yield {
        ...row,
        input: {
          ...row.input,
          eventName: inputEventName || row.input.eventName,
        },
      };
      return;
    }
  }

  throw new Error(`Dataset row not found for event: ${selectedEventName}`);
}

Eval<
  EventResearchInput,
  EventResearchResult,
  unknown,
  EventResearchMetadata
>(PROJECT_NAME, {
  data: runMode.startsWith('row-smoke') ? selectedDatasetRow() : evalData,
  task: async (input) => (await provider).research(input),
  scores: scorers,
  experimentName: `event-research-${selectedProvider}-${runMode}-${timestamp}`,
  description: `${selectedProvider === 'mistral' ? 'Mistral Small 4 direct' : selectedProvider === 'grok' ? 'Grok 4.20 via OpenRouter' : selectedProvider === 'openrouter' ? 'Gemini 3.6 Flash via OpenRouter' : selectedProvider === 'terra' ? 'GPT-5.6 Terra direct' : 'GPT-5.4 Mini direct'} native web-search ${runMode} for ${DATASET_NAME}.`,
  trialCount,
  maxConcurrency:
    selectedProvider === 'mistral' ? MISTRAL_MAX_CONCURRENCY : MAX_CONCURRENCY,
  metadata: {
    provider: selectedProvider === 'mistral' ? 'mistral' : selectedProvider === 'openai' || selectedProvider === 'terra' ? 'openai' : 'openrouter',
    providerConnection:
      selectedProvider === 'mistral' || selectedProvider === 'openai' || selectedProvider === 'terra'
        ? 'direct'
        : 'openrouter',
    model:
      selectedProvider === 'mistral'
        ? MISTRAL_MODEL
        : selectedProvider === 'grok'
        ? GROK_MODEL
        : selectedProvider === 'openrouter'
          ? OPENROUTER_MODEL
          : selectedProvider === 'terra'
            ? TERRA_MODEL
          : MODEL,
    searchEngine:
      selectedProvider === 'mistral'
        ? 'mistral-native'
        : selectedProvider === 'openai'
          || selectedProvider === 'terra'
          ? 'openai-native'
          : OPENROUTER_SEARCH_ENGINE,
    promptSlug: 'event-research-v0',
    promptVersion: PROMPT_VERSION,
    dataset: DATASET_NAME,
    datasetLabel: DATASET_LABEL,
    datasetVersion: DATASET_VERSION,
    reasoningEffort: selectedProvider === 'mistral' ? null : REASONING_EFFORT,
    searchContextSize:
      selectedProvider === 'openai' ? SEARCH_CONTEXT_SIZE : null,
    trialCount,
    runMode,
    selectedEventName: selectedEventName || null,
    inputEventName: inputEventName || null,
    gitRevision: gitRevision(),
  },
  tags: ['event-research', 'native-web-search', runMode],
});
