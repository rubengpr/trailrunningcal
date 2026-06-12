import { afterEach, describe, expect, it, vi } from 'vitest';

import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

const mocks = vi.hoisted(() => ({
  createOpenRouterClient: vi.fn(),
  runMarkdownAgent: vi.fn(),
  runImagesAgent: vi.fn(),
  franc: vi.fn(),
}));

vi.mock('franc', () => ({
  franc: mocks.franc,
}));

vi.mock('@/lib/integrations/openrouter/client', () => ({
  createOpenRouterClient: mocks.createOpenRouterClient,
}));

vi.mock('@/lib/integrations/openrouter/agents', () => ({
  runMarkdownAgent: mocks.runMarkdownAgent,
  runImagesAgent: mocks.runImagesAgent,
}));

import { extractFromMarkdown } from './service';

const MODEL = OPENROUTER_SCRAPE_MODEL_IDS[0];
const MARKDOWN = 'Official event markdown. '.repeat(60);

function event(
  overrides: Partial<TrailEventAgentEvent> = {},
): TrailEventAgentEvent {
  return {
    name: 'Cursa de la Guineu',
    description: 'Event description',
    websiteUrl: 'https://example.com/event',
    ...overrides,
  };
}

function race(overrides: Partial<TrailEventAgentRace> = {}): TrailEventAgentRace {
  return {
    name: 'Trail',
    date: '2099-06-01',
    city: 'Barcelona',
    province: 'Barcelona',
    distanceKm: 21,
    elevationGainM: 1000,
    ...overrides,
  };
}

function result(
  extractedEvent: TrailEventAgentEvent | null,
): OpenRouterServiceResult {
  const races = extractedEvent ? [race()] : [];
  return {
    event: extractedEvent,
    races,
    errorMessage: null,
    rawModelOutput: JSON.stringify({
      event: extractedEvent,
      races,
      errorMessage: null,
    }),
    usage: {
      promptTokens: 10,
      completionTokens: 5,
      reasoningTokens: null,
      totalTokens: 15,
      cost: 0.00014,
    },
  };
}

function clientWithTranslation(response: string) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: response } }],
        }),
      },
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('extractFromMarkdown description translation', () => {
  it('keeps Spanish descriptions unchanged', async () => {
    const client = clientWithTranslation('unused');
    const extracted = result(event({ description: 'Carrera de montaña.' }));
    mocks.createOpenRouterClient.mockReturnValue(client);
    mocks.runMarkdownAgent.mockResolvedValue(extracted);
    mocks.franc.mockReturnValue('spa');

    const output = await extractFromMarkdown(MARKDOWN, MODEL);

    expect(output.event?.description).toBe('Carrera de montaña.');
    expect(mocks.franc).toHaveBeenCalledWith('Carrera de montaña.', {
      only: ['spa', 'cat'],
    });
    expect(client.chat.completions.create).not.toHaveBeenCalled();
  });

  it('rewrites Catalan descriptions with gpt-5.4-nano', async () => {
    const client = clientWithTranslation(
      'La Cursa de la Guineu es una carrera de montaña.',
    );
    const extracted = result(
      event({ description: 'La Cursa de la Guineu es una cursa de muntanya.' }),
    );
    mocks.createOpenRouterClient.mockReturnValue(client);
    mocks.runMarkdownAgent.mockResolvedValue(extracted);
    mocks.franc.mockReturnValue('cat');

    const output = await extractFromMarkdown(MARKDOWN, MODEL);

    expect(client.chat.completions.create).toHaveBeenCalledWith({
      model: 'openai/gpt-5.4-nano',
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: expect.stringContaining(
            'La Cursa de la Guineu es una cursa de muntanya.',
          ),
        },
      ],
    });
    expect(output.event?.description).toBe(
      'La Cursa de la Guineu es una carrera de montaña.',
    );
    expect(JSON.parse(output.rawModelOutput).event.description).toBe(
      'La Cursa de la Guineu es una carrera de montaña.',
    );
  });

  it('skips translation when there is no event or description', async () => {
    const client = clientWithTranslation('unused');
    mocks.createOpenRouterClient.mockReturnValue(client);

    mocks.runMarkdownAgent.mockResolvedValueOnce(result(null));
    await extractFromMarkdown(MARKDOWN, MODEL);

    mocks.runMarkdownAgent.mockResolvedValueOnce(
      result(event({ description: null })),
    );
    await extractFromMarkdown(MARKDOWN, MODEL);

    expect(mocks.franc).not.toHaveBeenCalled();
    expect(client.chat.completions.create).not.toHaveBeenCalled();
  });

  it('keeps the original Catalan description when translation fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const client = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('translation failed')),
        },
      },
    };
    const originalDescription =
      'La Cursa de la Guineu es una cursa de muntanya.';
    const extracted = result(event({ description: originalDescription }));
    mocks.createOpenRouterClient.mockReturnValue(client);
    mocks.runMarkdownAgent.mockResolvedValue(extracted);
    mocks.franc.mockReturnValue('cat');

    const output = await extractFromMarkdown(MARKDOWN, MODEL);

    expect(output.event?.description).toBe(originalDescription);
    expect(output.rawModelOutput).toBe(extracted.rawModelOutput);
    expect(consoleError).toHaveBeenCalledWith(
      'OpenRouter description translation failed',
      { error: expect.any(Error) },
    );
  });

  it('keeps raw model output aligned after translation and future race filtering', async () => {
    const client = clientWithTranslation(
      'La Cursa de la Guineu es una carrera de montaña.',
    );
    const extracted = {
      ...result(
        event({
          description: 'La Cursa de la Guineu es una cursa de muntanya.',
        }),
      ),
      races: [race({ date: '2000-06-01' })],
    };
    mocks.createOpenRouterClient.mockReturnValue(client);
    mocks.runMarkdownAgent.mockResolvedValue(extracted);
    mocks.franc.mockReturnValue('cat');

    const output = await extractFromMarkdown(MARKDOWN, MODEL);
    const rawOutput = JSON.parse(output.rawModelOutput);

    expect(output.races).toEqual([]);
    expect(rawOutput.races).toEqual([]);
    expect(rawOutput.errorMessage).toBe(output.errorMessage);
    expect(rawOutput.event.description).toBe(output.event?.description);
  });
});
