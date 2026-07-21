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
const VALID_DESCRIPTION = [
  'La Cursa de la Guineu es una prueba de montaña que recorre senderos forestales, pistas y tramos tecnicos alrededor de Barcelona. La salida concentra varias distancias pensadas para corredores con distintos niveles de experiencia, con un recorrido principal que combina desnivel progresivo, zonas rapidas y pasos por espacios naturales cercanos al municipio.',
  'La organizacion plantea una jornada orientada a corredores populares y habituales del trail, con informacion clara sobre distancias, fechas y ubicacion. Las modalidades disponibles permiten escoger entre recorridos de diferente exigencia, manteniendo el foco en una experiencia de montaña accesible y bien integrada en el calendario catalan.',
].join('\n\n');
const REPAIRED_DESCRIPTION = [
  'La Cursa de la Guineu es una carrera de montaña con salida en Barcelona y un recorrido de 21 km que combina senderos, pistas y tramos con desnivel positivo. La prueba se presenta como una cita de trail para corredores que buscan una distancia media, con datos principales ya definidos y una ubicacion claramente asociada al calendario catalan.',
  'La informacion extraida confirma la fecha, la ciudad, la provincia, la distancia y el desnivel de la modalidad principal. La descripcion mantiene un tono editorial y prudente, sin anadir servicios no indicados ni detalles logisticos inventados, y resume la carrera de forma util para revisar el evento antes de publicarlo.',
].join('\n\n');

function event(
  overrides: Partial<TrailEventAgentEvent> = {},
): TrailEventAgentEvent {
  return {
    name: 'Cursa de la Guineu',
    description: VALID_DESCRIPTION,
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
    tiers: [],
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

function clientWithCompletion(response: string) {
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
    const client = clientWithCompletion('unused');
    const extracted = result(event());
    mocks.createOpenRouterClient.mockReturnValue(client);
    mocks.runMarkdownAgent.mockResolvedValue(extracted);
    mocks.franc.mockReturnValue('spa');

    const output = await extractFromMarkdown(MARKDOWN, MODEL);

    expect(output.event?.description).toBe(VALID_DESCRIPTION);
    expect(mocks.franc).toHaveBeenCalledWith(VALID_DESCRIPTION, {
      only: ['spa', 'cat'],
    });
    expect(client.chat.completions.create).not.toHaveBeenCalled();
  });

  it('rewrites Catalan descriptions with gpt-5.4-nano', async () => {
    const client = clientWithCompletion(VALID_DESCRIPTION);
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
    expect(output.event?.description).toBe(VALID_DESCRIPTION);
    expect(JSON.parse(output.rawModelOutput).event.description).toBe(
      VALID_DESCRIPTION,
    );
  });

  it('skips translation when there is no event or description', async () => {
    const client = clientWithCompletion('unused');
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
    const client = clientWithCompletion(VALID_DESCRIPTION);
    const extracted = {
      ...result(
        event({
          description: 'La Cursa de la Guineu es una cursa de muntanya.',
        }),
      ),
      races: [
        race({
          date: '2000-06-01',
          tiers: [{ priceEur: 20, endsAt: null }],
        }),
      ],
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

  it('preserves tiers while translating the event description', async () => {
    const tiers = [
      { priceEur: 20, endsAt: '2099-04-01' },
      { priceEur: 30, endsAt: '2099-05-01' },
    ];
    const client = clientWithCompletion(VALID_DESCRIPTION);
    const extracted = {
      ...result(
        event({
          description: 'La Cursa de la Guineu es una cursa de muntanya.',
        }),
      ),
      races: [race({ tiers })],
    };
    mocks.createOpenRouterClient.mockReturnValue(client);
    mocks.runMarkdownAgent.mockResolvedValue(extracted);
    mocks.franc.mockReturnValue('cat');

    const output = await extractFromMarkdown(MARKDOWN, MODEL);

    expect(output.races[0]?.tiers).toEqual(tiers);
    expect(JSON.parse(output.rawModelOutput).races[0].tiers).toEqual(tiers);
  });
});

describe('extractFromMarkdown description format check', () => {
  it('repairs single-paragraph descriptions', async () => {
    const client = clientWithCompletion(REPAIRED_DESCRIPTION);
    const extracted = result(
      event({ description: VALID_DESCRIPTION.replace(/\n\n/g, ' ') }),
    );
    mocks.createOpenRouterClient.mockReturnValue(client);
    mocks.runMarkdownAgent.mockResolvedValue(extracted);
    mocks.franc.mockReturnValue('spa');

    const output = await extractFromMarkdown(MARKDOWN, MODEL);

    expect(client.chat.completions.create).toHaveBeenCalledWith({
      model: 'openai/gpt-5.4-nano',
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: expect.stringContaining('Current description:'),
        },
      ],
    });
    expect(output.event?.description).toBe(REPAIRED_DESCRIPTION);
  });

  it('repairs descriptions under 400 characters', async () => {
    const client = clientWithCompletion(REPAIRED_DESCRIPTION);
    const shortDescription =
      'La Cursa de la Guineu es una carrera de montaña en Barcelona.\n\nIncluye una distancia de trail para corredores populares.';
    const extracted = result(event({ description: shortDescription }));
    mocks.createOpenRouterClient.mockReturnValue(client);
    mocks.runMarkdownAgent.mockResolvedValue(extracted);
    mocks.franc.mockReturnValue('spa');

    const output = await extractFromMarkdown(MARKDOWN, MODEL);

    expect(client.chat.completions.create).toHaveBeenCalledOnce();
    expect(output.event?.description).toBe(REPAIRED_DESCRIPTION);
  });

  it('keeps the original description when format repair fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const client = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('repair failed')),
        },
      },
    };
    const shortDescription =
      'La Cursa de la Guineu es una carrera de montaña en Barcelona.';
    const extracted = result(event({ description: shortDescription }));
    mocks.createOpenRouterClient.mockReturnValue(client);
    mocks.runMarkdownAgent.mockResolvedValue(extracted);
    mocks.franc.mockReturnValue('spa');

    const output = await extractFromMarkdown(MARKDOWN, MODEL);

    expect(output.event?.description).toBe(shortDescription);
    expect(consoleError).toHaveBeenCalledWith(
      'OpenRouter description format repair failed',
      { error: expect.any(Error) },
    );
  });

  it('keeps raw model output aligned after format repair and future race filtering', async () => {
    const client = clientWithCompletion(REPAIRED_DESCRIPTION);
    const extracted = {
      ...result(event({ description: 'Descripcion corta.' })),
      races: [race({ date: '2000-06-01' })],
    };
    mocks.createOpenRouterClient.mockReturnValue(client);
    mocks.runMarkdownAgent.mockResolvedValue(extracted);
    mocks.franc.mockReturnValue('spa');

    const output = await extractFromMarkdown(MARKDOWN, MODEL);
    const rawOutput = JSON.parse(output.rawModelOutput);

    expect(output.races).toEqual([]);
    expect(output.event?.description).toBe(REPAIRED_DESCRIPTION);
    expect(rawOutput.races).toEqual([]);
    expect(rawOutput.errorMessage).toBe(output.errorMessage);
    expect(rawOutput.event.description).toBe(output.event?.description);
  });
});
