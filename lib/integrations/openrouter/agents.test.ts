import { describe, expect, it } from 'vitest';
import type OpenAI from 'openai';

import { TRAIL_EVENT_AGENT_JSON_SCHEMA } from '@/lib/agents/trail-event-agent-schema';
import { TRAIL_EVENT_AGENT_INSTRUCTIONS } from '@/lib/prompts/trail-event-agent-instructions';
import { normalizeRaceName } from '@/lib/races/utils';
import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import { runMarkdownAgent } from '@/lib/integrations/openrouter/agents';

const MODEL = OPENROUTER_SCRAPE_MODEL_IDS[0];

function agentOutput(tiers?: unknown): string {
  return JSON.stringify({
    event: {
      name: 'Trail Event',
      description: null,
      websiteUrl: 'https://example.com',
    },
    races: [
      {
        name: '21K',
        date: '2027-05-01',
        city: 'Barcelona',
        province: 'Barcelona',
        distanceKm: 21,
        elevationGainM: 900,
        ...(tiers === undefined ? {} : { tiers }),
      },
    ],
    errorMessage: null,
  });
}

function clientWithOutput(output: string): OpenAI {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: output } }],
        }),
      },
    },
  } as unknown as OpenAI;
}

describe('normalizeRaceName', () => {
  it.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['   ', null],
    ['/', null],
    [',', null],
    ['-', null],
    ['---', null],
    ['|', null],
    [' / , - | ', null],
  ])('returns null for missing or symbol-only names', (input, expected) => {
    expect(normalizeRaceName(input)).toBe(expected);
  });

  it.each([
    [' Trail ', 'Trail'],
    ['Trail & Run 2026', 'Trail & Run 2026'],
    ['10K', '10K'],
  ])('keeps names with letters or numbers', (input, expected) => {
    expect(normalizeRaceName(input)).toBe(expected);
  });
});

describe('TRAIL_EVENT_AGENT_JSON_SCHEMA', () => {
  it('allows null race names in structured output', () => {
    const races = TRAIL_EVENT_AGENT_JSON_SCHEMA.properties.races;
    const name = races.items.properties.name;

    expect(name).toEqual({
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });
  });

  it('defines optional pricing as a zero-to-five tier array', () => {
    const races = TRAIL_EVENT_AGENT_JSON_SCHEMA.properties.races;
    const tiers = races.items.properties.tiers;

    expect(races.items.required).toContain('tiers');
    expect(tiers.maxItems).toBe(5);
    expect(tiers.items.required).toEqual(['priceEur', 'endsAt']);
    expect(tiers.items.properties.priceEur.type).toBe('number');
  });
});

describe('race tier extraction normalization', () => {
  it('defaults missing legacy tier output to an empty array', async () => {
    const result = await runMarkdownAgent(
      clientWithOutput(agentOutput()),
      'markdown',
      MODEL,
    );

    expect(result.races[0].tiers).toEqual([]);
  });

  it('rounds decimal prices and keeps a valid ordered schedule', async () => {
    const result = await runMarkdownAgent(
      clientWithOutput(agentOutput([
        { priceEur: 19.5, endsAt: '2027-01-31' },
        { priceEur: 29.49, endsAt: '2027-02-28' },
      ])),
      'markdown',
      MODEL,
    );

    expect(result.races[0].tiers).toEqual([
      { priceEur: 20, endsAt: '2027-01-31' },
      { priceEur: 29, endsAt: '2027-02-28' },
    ]);
  });

  it('keeps valid free, paid, and five-tier schedules', async () => {
    const schedules = [
    [{ priceEur: 0, endsAt: null }],
    [{ priceEur: 35, endsAt: null }],
    Array.from({ length: 5 }, (_, index) => ({
      priceEur: 20 + index * 5,
      endsAt: `2027-0${index + 1}-28`,
    })),
    ];

    for (const tiers of schedules) {
      const result = await runMarkdownAgent(
        clientWithOutput(agentOutput(tiers)),
        'markdown',
        MODEL,
      );

      expect(result.races[0].tiers).toEqual(tiers);
    }
  });

  const invalidSchedules: unknown[][] = [
    [{ priceEur: 20, endsAt: '2027-01-31' }, { priceEur: 25, endsAt: null }],
    [{ priceEur: 20, endsAt: '2027-01-31' }, { priceEur: 25, endsAt: '2027-01-31' }],
    [{ priceEur: 20, endsAt: '2027-02-28' }, { priceEur: 25, endsAt: '2027-01-31' }],
    [{ priceEur: 20, endsAt: '2027-02-30' }],
    [{ priceEur: 10000, endsAt: null }],
    Array.from({ length: 6 }, (_, index) => ({
      priceEur: 20 + index,
      endsAt: `2027-0${index + 1}-28`,
    })),
  ];

  it.each(invalidSchedules)('drops an invalid schedule without dropping the race %#', async (tiers) => {
    const result = await runMarkdownAgent(
      clientWithOutput(agentOutput(tiers)),
      'markdown',
      MODEL,
    );

    expect(result.races).toHaveLength(1);
    expect(result.races[0].tiers).toEqual([]);
  });

  it('instructs the agent to keep missing and ambiguous pricing optional', () => {
    expect(TRAIL_EVENT_AGENT_INSTRUCTIONS).toContain(
      'use [] when pricing is absent, ambiguous, or unreliable',
    );
    expect(TRAIL_EVENT_AGENT_INSTRUCTIONS).toContain(
      'general-public base price only',
    );
    expect(TRAIL_EVENT_AGENT_INSTRUCTIONS).toContain(
      'round to the nearest whole euro',
    );
    expect(TRAIL_EVENT_AGENT_INSTRUCTIONS).toContain(
      'Copy a shared schedule only when the source explicitly applies it',
    );
    expect(TRAIL_EVENT_AGENT_INSTRUCTIONS).toContain(
      'exclude member/federation discounts',
    );
  });
});
