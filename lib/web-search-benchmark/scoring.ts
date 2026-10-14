import { z } from 'zod';
import type { Dossier } from '@/types/blog-research.types';

export const basics = [
  'name',
  'season',
  'municipalities',
  'provinces',
  'zone',
] as const;
export const weights = { races: 35, route: 30, history: 25, elite: 10 };
// Verified facts needed for full points in each criterion.
export const targets = { races: 8, route: 8, history: 6, elite: 3 };
export const missingPenalty = 5;

const quote = {
  excerpt: z.string(),
  reference: z.string(),
  explanation: z.string().min(1),
};
const basic = z
  .object({ status: z.enum(['correct', 'missing', 'incorrect']), ...quote })
  .strict();
const fact = z
  .object({ excerpt: z.string(), reference: z.string() })
  .strict();
const criterion = z
  .object({
    items: z.array(fact),
    explanation: z.string().min(1),
    errors: z.array(z.object(quote).strict()),
  })
  .strict();
export const reportSchema = z
  .object({
    basics: z
      .object({
        name: basic,
        season: basic,
        municipalities: basic,
        provinces: basic,
        zone: basic,
      })
      .strict(),
    criteria: z
      .object({
        races: criterion,
        route: criterion,
        history: criterion,
        elite: criterion,
      })
      .strict(),
  })
  .strict();

const quoteJson = {
  excerpt: { type: 'string' },
  reference: { type: 'string' },
  explanation: { type: 'string' },
};
const criterionJson = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'explanation', 'errors'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['excerpt', 'reference'],
        properties: { excerpt: { type: 'string' }, reference: { type: 'string' } },
      },
    },
    explanation: { type: 'string' },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: Object.keys(quoteJson),
        properties: quoteJson,
      },
    },
  },
};
export const reportJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['basics', 'criteria'],
  properties: {
    basics: {
      type: 'object',
      additionalProperties: false,
      required: [...basics],
      properties: Object.fromEntries(
        basics.map((k) => [
          k,
          {
            type: 'object',
            additionalProperties: false,
            required: ['status', ...Object.keys(quoteJson)],
            properties: {
              status: { type: 'string', enum: ['correct', 'missing', 'incorrect'] },
              ...quoteJson,
            },
          },
        ]),
      ),
    },
    criteria: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(weights),
      properties: Object.fromEntries(
        Object.keys(weights).map((k) => [k, criterionJson]),
      ),
    },
  },
};

const normalize = (value: string) =>
  value.replace(/\s+/g, ' ').trim().toLowerCase();
const within = (haystack: string, needle: string) =>
  !!normalize(needle) && normalize(haystack).includes(normalize(needle));

// The judge only labels; code decides. A basic field needs verifiable quotes to count as correct or incorrect; otherwise it counts as missing.
export function evaluateReport(
  value: unknown,
  dossier: Dossier,
  groundTruth: string,
) {
  const report = reportSchema.parse(value);
  const body = [dossier.eventName, dossier.context, ...dossier.observations].join(
    '\n',
  );
  const proven = (q: { excerpt: string; reference: string }) =>
    within(body, q.excerpt) && within(groundTruth, q.reference);
  const discarded: string[] = [];
  const missing: string[] = [];
  for (const key of basics) {
    const item = report.basics[key];
    if (item.status === 'incorrect' && proven(item)) discarded.push(key);
    else if (item.status === 'correct' && within(body, item.excerpt)) continue;
    else missing.push(key);
  }
  const facts = {} as Record<keyof typeof weights, number>;
  const proofs = {} as Record<keyof typeof weights, number>;
  const points = Object.fromEntries(
    (Object.keys(weights) as (keyof typeof weights)[]).map((key) => {
      const { items, errors } = report.criteria[key];
      // Count distinct facts the ground truth supports; each proven error cancels one.
      const found = new Set(
        items.filter(proven).map((item) => normalize(item.excerpt)),
      ).size;
      const wrong = errors.filter(proven).length;
      facts[key] = found;
      proofs[key] = wrong;
      // An invented elite claim voids the criterion.
      const value =
        wrong && key === 'elite'
          ? 0
          : Math.max(0, Math.min(found - wrong, targets[key])) / targets[key];
      return [key, Math.round(value * weights[key] * 10) / 10];
    }),
  ) as Record<keyof typeof weights, number>;
  const publishable = discarded.length === 0;
  const raw = Object.values(points).reduce((a, b) => a + b, 0);
  const quality = publishable
    ? Math.max(0, raw - missing.length * missingPenalty)
    : null;
  return {
    report,
    publishable,
    discarded,
    missing,
    facts,
    errors: proofs,
    points,
    quality,
  };
}
