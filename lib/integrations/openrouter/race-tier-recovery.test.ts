import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { TrailEventAgentRace } from '@/types/trail-event-agent.types';
import {
  combineOpenRouterUsage,
  extractRaceTierPricingEvidence,
  recoverMissingRaceTiers,
} from './race-tier-recovery';

const BURRIAC_PRICING = `
Quin preu te la cursa?
Els preus de la cursa són els següents:
Fins al 22 de maig – Preu llarga 32 EUR – preu curta 30 EUR
Fins al 19 de juny – Preu llarga 35 EUR – preu curta 33 EUR
A partir del 20 de juny – Preu llarga 38 EUR – preu curta 36 EUR
Els participants no federats pagaran un recàrrec de 2 euros en concepte d’assegurança.
`;

const MONTLUDE_PRICING = `
## PREU INSCRIPCIÓ
Tram 1: del 20 al 31 de Desembre 15€
Tram 2: de l'1 de Gener al 30 d'Abril 20€
Tram 3: de l'1 de Maig al 6 d'Agost 25€
Presencial dia 7 d'Agost 30€
`;

const MISPORTS_MERCHANDISE_ONLY_PRICING = `
Inscripcions
descomptes per a grups de 4 persones o més.
La taula de preus de la inscripció no inclou la samarreta.
Aquesta es podrà comprar a part en el formulari +5€.
La data de tancament d'inscripcions 1 de Setembre 23h59.
![](https://misports.cat/wp-content/uploads/2026/07/preus_2026_v2.jpg)
`;

const INFINITE_RACE_NO_PRICING = `
INFINITE RACE VAL D'ARAN
[
0
](https://www.infiniteracearan.com/cart)
# INFINITE RACE VAL D’ARAN
#### 18, 19 y 20 de septiembre de 2026
## BACKYARD ULTRA
Un circuito de 6,7 km a completar en menos de una hora.
## AVISO LEGAL Y CONDICIONES GENERALES DE USO
El acceso al Sitio Web por el Usuario tiene carácter libre y, por regla general,
es gratuito sin que el Usuario tenga que proporcionar una contraprestación.
`;

const LA_MARRANA_FEDERATED_PRICING = `
Inscripcions
FEDERATS FEEC
35€
Volta del Gegant
INSCRIURE'S
26€
Circ de Morens
INSCRIURE'S
18€
Passeig de les Marmotes
INSCRIURE'S
18€
Mirador de Bacivers
INSCRIURE'S
NO FEDERATS
40€
Volta del Gegant
INSCRIURE'S
31€
Circ de Morens
INSCRIURE'S
23€
Passeig de les Marmotes
INSCRIURE'S
23€
Mirador de Bacivers
INSCRIURE'S
La llicència temporal obligatòria per a no federats costa 5€.
Les inscripcions es tancaran l'1 de setembre de 2026.
La samarreta opcional costa 18€.
`;

const OLLA_DE_NURIA_NOISY_PRICING = `
## Mitja Olla
**Data:** 21 de setembre del 2025
### Inscripcions
**PREU INSCRIPCIÓ: **30€
* -5€ Socis Unió Excursionista de Vic
* 10€ NO federats

## Valls de L'Olla
**Data:** 20 de setembre del 2026
### Categories i premis
1r classificat: 1500€
2n classificat: 800€
3r classificat: 300€
### Inscripcions
Del 19/05 a les 20:00h fins el 22/05 a les 23:59h: INSCRIPCIONS
PREU INSCRIPCIÓ: 49€
* -5€ Socis Unió Excursionista de Vic
* 10€ NO federats
* 10€ assegurança devolució
Fins el 31 de maig es retornarà el 100 % menys 5€ per gestió.

## Olla Vertical
**Data:** 19 de setembre del 2026
### Inscripcions
**DATA INICI INSCRIPCIONS: **19 de maig
**PREU INSCRIPCIÓ: **27€
* -5€ Socis Unió Excursionista de Vic
* 10€ NO federats
* 5€ assegurança devolució

## Mitja Olla
**Data:** 20 de setembre del 2026
### Inscripcions
**DATA INICI INSCRIPCIONS: **19 de maig
**PREU INSCRIPCIÓ: **32€
* -5€ Socis Unió Excursionista de Vic
* 10€ NO federats
* 5€ assegurança devolució

## Olletes
Cursa per a infants i joves de 4 a 15 anys.
**PREU INSCRIPCIÓ: **22€
* 5€ NO federats
`;

function race(
  overrides: Partial<TrailEventAgentRace> = {},
): TrailEventAgentRace {
  return {
    name: 'Llarga',
    date: '2026-09-05',
    city: 'Vilassar de Mar',
    province: 'Barcelona',
    distanceKm: 21,
    elevationGainM: 851,
    tiers: [],
    ...overrides,
  };
}

function result(races: TrailEventAgentRace[]): OpenRouterServiceResult {
  return {
    event: {
      name: 'Event',
      description: null,
      websiteUrl: 'https://example.com',
    },
    races,
    errorMessage: null,
    rawModelOutput: '{}',
    usage: usage(100, 20, 5, 0.01),
  };
}

function usage(
  promptTokens: number,
  completionTokens: number,
  reasoningTokens: number | null,
  cost: number | null,
): OpenRouterScrapeUsage {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    reasoningTokens,
    cost,
  };
}

function clientWithOutput(output: unknown, recoveryUsage = usage(30, 10, 2, 0.02)) {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(output) } }],
    usage: {
      prompt_tokens: recoveryUsage.promptTokens,
      completion_tokens: recoveryUsage.completionTokens,
      total_tokens: recoveryUsage.totalTokens,
      completion_tokens_details: {
        reasoning_tokens: recoveryUsage.reasoningTokens,
      },
      cost: recoveryUsage.cost,
    },
  });

  return {
    client: {
      chat: { completions: { create } },
    } as unknown as OpenAI,
    create,
  };
}

describe('race tier pricing evidence', () => {
  it('extracts compact Burriac and Montlude pricing passages', () => {
    const burriac = extractRaceTierPricingEvidence(
      `Unrelated introduction\n${BURRIAC_PRICING}\nUnrelated footer`,
    );
    const montlude = extractRaceTierPricingEvidence(MONTLUDE_PRICING);

    expect(burriac).toContain('Preu llarga 32 EUR');
    expect(burriac).toContain('recàrrec de 2 euros');
    expect(montlude).toContain("Tram 3: de l'1 de Maig");
  });

  it('keeps a complete Catalan federated and non-federated price block', () => {
    const evidence = extractRaceTierPricingEvidence(
      LA_MARRANA_FEDERATED_PRICING,
    );

    expect(evidence).toContain('FEDERATS FEEC');
    expect(evidence).toContain('NO FEDERATS');
    expect(evidence).toContain('23€');
    expect(evidence).toContain("INSCRIURE'S");
  });

  it('ignores currency without nearby registration pricing language', () => {
    expect(
      extractRaceTierPricingEvidence(
        'La samarreta commemorativa costa 20€ i es ven a la botiga.',
      ),
    ).toBeNull();
  });

  it('ignores an empty cart and free website access without race pricing', () => {
    expect(
      extractRaceTierPricingEvidence(INFINITE_RACE_NO_PRICING),
    ).toBeNull();
  });

  it('caps long evidence', () => {
    const markdown = Array.from(
      { length: 1_000 },
      (_, index) => `Preu inscripció tram ${index}: ${index + 1}€`,
    ).join('\n');

    expect(extractRaceTierPricingEvidence(markdown)?.length).toBeLessThanOrEqual(
      12_000,
    );
  });
});

describe('race tier recovery', () => {
  it('recovers separate shared-row schedules and aggregates usage', async () => {
    const { client, create } = clientWithOutput({
      races: [
        {
          raceIndex: 0,
          tiers: [
            { priceEur: 32, endsAt: '2026-05-22' },
            { priceEur: 35, endsAt: '2026-06-19' },
            { priceEur: 38, endsAt: '2026-09-05' },
          ],
        },
        {
          raceIndex: 1,
          tiers: [
            { priceEur: 30, endsAt: '2026-05-22' },
            { priceEur: 33, endsAt: '2026-06-19' },
            { priceEur: 36, endsAt: '2026-09-05' },
          ],
        },
      ],
    });
    const initial = result([
      race(),
      race({ name: 'Curta', distanceKm: 15, elevationGainM: 627 }),
    ]);

    const output = await recoverMissingRaceTiers(
      client,
      BURRIAC_PRICING,
      initial,
    );

    expect(output.races[0].tiers).toEqual([
      { priceEur: 32, endsAt: '2026-05-22' },
      { priceEur: 35, endsAt: '2026-06-19' },
      { priceEur: 38, endsAt: '2026-09-05' },
    ]);
    expect(output.races[1].tiers.at(-1)).toEqual({
      priceEur: 36,
      endsAt: '2026-09-05',
    });
    expect(output.usage).toEqual(usage(130, 30, 7, 0.03));
    expect(JSON.parse(output.rawModelOutput).races).toEqual(output.races);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/gpt-5.6-terra',
        reasoning_effort: 'low',
        response_format: expect.objectContaining({ type: 'json_schema' }),
      }),
    );
  });

  it('targets only missing races and never overwrites existing tiers', async () => {
    const existingTiers = [{ priceEur: 40, endsAt: null }];
    const { client, create } = clientWithOutput({
      races: [{
        raceIndex: 1,
        tiers: [{ priceEur: 30, endsAt: null }],
      }],
    });
    const initial = result([
      race({ tiers: existingTiers }),
      race({ name: 'Curta', distanceKm: 15 }),
    ]);

    const output = await recoverMissingRaceTiers(
      client,
      BURRIAC_PRICING,
      initial,
    );
    const prompt = create.mock.calls[0][0].messages[0].content as string;

    expect(output.races[0].tiers).toEqual(existingTiers);
    expect(output.races[1].tiers).toEqual([{ priceEur: 30, endsAt: null }]);
    expect(prompt).not.toContain('"raceIndex": 0');
    expect(prompt).toContain('"raceIndex": 1');
  });

  it('supports omitted years and a final onsite registration deadline', async () => {
    const { client } = clientWithOutput({
      races: [{
        raceIndex: 0,
        tiers: [
          { priceEur: 15, endsAt: '2025-12-31' },
          { priceEur: 20, endsAt: '2026-04-30' },
          { priceEur: 25, endsAt: '2026-08-06' },
          { priceEur: 30, endsAt: '2026-08-07' },
        ],
      }],
    });

    const output = await recoverMissingRaceTiers(
      client,
      MONTLUDE_PRICING,
      result([race({ date: '2026-08-08' })]),
    );

    expect(output.races[0].tiers[0].endsAt).toBe('2025-12-31');
    expect(output.races[0].tiers.at(-1)?.endsAt).toBe('2026-08-07');
  });

  it.each([
    {
      label: 'invalid schedule',
      response: {
        races: [{
          raceIndex: 0,
          tiers: [
            { priceEur: 20, endsAt: '2026-06-01' },
            { priceEur: 30, endsAt: null },
          ],
        }],
      },
    },
    {
      label: 'duplicate race indexes',
      response: {
        races: [
          {
            raceIndex: 0,
            tiers: [{ priceEur: 20, endsAt: null }],
          },
          {
            raceIndex: 0,
            tiers: [{ priceEur: 30, endsAt: null }],
          },
        ],
      },
    },
    {
      label: 'unknown race index',
      response: {
        races: [{
          raceIndex: 99,
          tiers: [{ priceEur: 20, endsAt: null }],
        }],
      },
    },
  ])('ignores $label', async ({ response }) => {
    const { client } = clientWithOutput(response);

    const output = await recoverMissingRaceTiers(
      client,
      BURRIAC_PRICING,
      result([race()]),
    );

    expect(output.races[0].tiers).toEqual([]);
  });

  it('does not map child-only pricing when recovery returns no match', async () => {
    const { client, create } = clientWithOutput({
      races: [{ raceIndex: 0, tiers: [] }],
    });
    const childPricing =
      'Inscripció Marrec infantil: 6€. Cursa per a infants de 0 a 14 anys.';

    const output = await recoverMissingRaceTiers(
      client,
      childPricing,
      result([race()]),
    );
    const prompt = create.mock.calls[0][0].messages[0].content as string;

    expect(output.races[0].tiers).toEqual([]);
    expect(prompt).toContain("Don't use prices for child/youth races");
  });

  it('does not map a merchandise price when race prices are image-only', async () => {
    const { client, create } = clientWithOutput({
      races: [
        { raceIndex: 0, tiers: [] },
        { raceIndex: 1, tiers: [] },
        { raceIndex: 2, tiers: [] },
      ],
    });
    const initial = result([
      race({ name: 'Marató', distanceKm: 42 }),
      race({ name: 'Trail', distanceKm: 26 }),
      race({ name: 'Short', distanceKm: 10 }),
    ]);

    const output = await recoverMissingRaceTiers(
      client,
      MISPORTS_MERCHANDISE_ONLY_PRICING,
      initial,
    );
    const prompt = create.mock.calls[0][0].messages[0].content as string;

    expect(output.races.map(({ tiers }) => tiers)).toEqual([[], [], []]);
    expect(prompt).toContain('comprar a part en el formulari +5€');
    expect(prompt).toContain('exclude member/federation discounts');
    expect(prompt).toContain('merchandise');
  });

  it('subtracts non-federated insurance from an adult flat base price', async () => {
    const expectedDeadline = '2026-09-01';
    const { client, create } = clientWithOutput({
      races: [{
        raceIndex: 0,
        tiers: [{ priceEur: 35, endsAt: expectedDeadline }],
      }],
    });
    const initial = result([
      race({ name: 'Volta del Gegant', distanceKm: 24 }),
    ]);

    const output = await recoverMissingRaceTiers(
      client,
      LA_MARRANA_FEDERATED_PRICING,
      initial,
    );
    const prompt = create.mock.calls[0][0].messages[0].content as string;

    expect(output.races[0].tiers).toEqual([
      { priceEur: 35, endsAt: expectedDeadline },
    ]);
    expect(prompt).toContain(
      'subtract that surcharge to obtain the general-public base price',
    );
    expect(prompt).toContain(
      'For one flat price, use the explicit registration closing date',
    );
  });

  it('recovers adult Olla de Núria prices from noisy mixed evidence', async () => {
    const { client, create } = clientWithOutput({
      races: [
        {
          raceIndex: 0,
          tiers: [{ priceEur: 49, endsAt: '2026-05-22' }],
        },
        {
          raceIndex: 1,
          tiers: [{ priceEur: 27, endsAt: null }],
        },
        {
          raceIndex: 2,
          tiers: [{ priceEur: 32, endsAt: null }],
        },
      ],
    });
    const initial = result([
      race({ name: "Valls de L'Olla", date: '2026-09-20', distanceKm: 24 }),
      race({ name: 'Olla Vertical', date: '2026-09-19', distanceKm: 3.78 }),
      race({ name: 'Mitja Olla', date: '2026-09-20', distanceKm: 12.5 }),
    ]);

    const output = await recoverMissingRaceTiers(
      client,
      OLLA_DE_NURIA_NOISY_PRICING,
      initial,
    );
    const prompt = create.mock.calls[0][0].messages[0].content as string;

    expect(output.races.map(({ tiers }) => tiers)).toEqual([
      [{ priceEur: 49, endsAt: '2026-05-22' }],
      [{ priceEur: 27, endsAt: null }],
      [{ priceEur: 32, endsAt: null }],
    ]);
    expect(prompt).toContain('1r classificat: 1500€');
    expect(prompt).toContain('**PREU INSCRIPCIÓ: **30€');
    expect(prompt).toContain('**PREU INSCRIPCIÓ: **22€');
    expect(prompt).toContain("Don't use prices for child/youth races");
    expect(prompt).toContain(
      'exclude member/federation discounts, licenses, insurance',
    );
  });

  it('skips recovery without missing tiers or pricing evidence', async () => {
    const { client, create } = clientWithOutput({ races: [] });

    const complete = result([
      race({ tiers: [{ priceEur: 20, endsAt: null }] }),
    ]);
    expect(
      await recoverMissingRaceTiers(client, BURRIAC_PRICING, complete),
    ).toBe(complete);

    const missing = result([race()]);
    expect(
      await recoverMissingRaceTiers(client, 'No registration price.', missing),
    ).toBe(missing);
    expect(create).not.toHaveBeenCalled();
  });

  it('skips Infinite Race recovery and preserves empty tiers', async () => {
    const { client, create } = clientWithOutput({ races: [] });
    const primary = result([
      race({ name: 'Backyard Ultra', distanceKm: 6.7 }),
      race({ name: 'Popular', distanceKm: 6.7 }),
    ]);

    const output = await recoverMissingRaceTiers(
      client,
      INFINITE_RACE_NO_PRICING,
      primary,
    );

    expect(output).toBe(primary);
    expect(output.races.map(({ tiers }) => tiers)).toEqual([[], []]);
    expect(create).not.toHaveBeenCalled();
  });

  it('keeps the primary result when recovery fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const primary = result([race()]);
    const client = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('timeout')),
        },
      },
    } as unknown as OpenAI;

    const output = await recoverMissingRaceTiers(
      client,
      BURRIAC_PRICING,
      primary,
    );

    expect(output).toBe(primary);
    expect(consoleError).toHaveBeenCalledWith(
      'OpenRouter race tier recovery failed',
      { error: expect.any(Error) },
    );
  });
});

describe('OpenRouter usage aggregation', () => {
  it('preserves null cost and reasoning when either call omits them', () => {
    expect(
      combineOpenRouterUsage(
        usage(100, 20, null, 0.01),
        usage(30, 10, 2, null),
      ),
    ).toEqual(usage(130, 30, null, null));
  });

  it('uses whichever usage object is available', () => {
    const recovery = usage(30, 10, 2, 0.02);

    expect(combineOpenRouterUsage(null, recovery)).toBe(recovery);
    expect(combineOpenRouterUsage(recovery, null)).toBe(recovery);
  });
});
