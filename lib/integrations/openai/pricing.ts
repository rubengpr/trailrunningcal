import type { AppliedRates, CostEstimate, CostTokens, CostUnavailable, InferenceCall } from '@/types/blog-cost.types';

type Rates = Pick<AppliedRates, 'inputPerMillion' | 'cachedInputPerMillion' | 'cacheWrite30mPerMillion' | 'cacheWrite12hPerMillion' | 'outputPerMillion'>;

// Verified on 2026-10-21 against https://developers.openai.com/api/docs/pricing.
// Bump the version whenever a rate changes; recorded estimates keep their own snapshot.
export const pricingVersion = '2026-10-21';
const source = 'https://developers.openai.com/api/docs/pricing';
const longContextThreshold = 272_000;
// Web search: $10 per 1k calls. Only `search` actions are documented as tool call charges.
const searchPerCall = 0.01;
const prices: Record<string, Record<string, {short: Rates; long: Rates}>> = {
  'gpt-6.1-sol': {
    standard: {
      short: {inputPerMillion:2,cachedInputPerMillion:0.1,cacheWrite30mPerMillion:2.5,cacheWrite12hPerMillion:5,outputPerMillion:10},
      long: {inputPerMillion:4,cachedInputPerMillion:0.2,cacheWrite30mPerMillion:5,cacheWrite12hPerMillion:10,outputPerMillion:15},
    },
    flex: {
      short: {inputPerMillion:1,cachedInputPerMillion:0.05,cacheWrite30mPerMillion:1.25,cacheWrite12hPerMillion:2.5,outputPerMillion:5},
      long: {inputPerMillion:2,cachedInputPerMillion:0.1,cacheWrite30mPerMillion:2.5,cacheWrite12hPerMillion:5,outputPerMillion:7.5},
    },
    fast: {
      short: {inputPerMillion:4,cachedInputPerMillion:0.2,cacheWrite30mPerMillion:5,cacheWrite12hPerMillion:10,outputPerMillion:20},
      long: {inputPerMillion:8,cachedInputPerMillion:0.4,cacheWrite30mPerMillion:10,cacheWrite12hPerMillion:20,outputPerMillion:30},
    },
  },
};
// Effective `service_tier` values reported by responses. Priority was renamed Fast.
const tiers: Record<string, string> = {default:'standard',flex:'flex',priority:'fast',fast:'fast'};

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function field(value: unknown, key: string): unknown {
  return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
}
function rounded(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}
function priced(model: string): string | null {
  // Dated snapshots such as `gpt-6.1-sol-2026-09-30` share their alias price.
  return Object.keys(prices).find(name => model === name || new RegExp(`^${name.replace('.', '\\.')}-\\d{4}-\\d{2}-\\d{2}$`).test(model)) ?? null;
}

// Every input token belongs to exactly one category; reasoning is already part of output.
export function tokens(usage: unknown): {tokens: CostTokens; ttl: AppliedRates['cacheWriteTtl']} | null {
  const input = count(field(usage, 'input_tokens'));
  const output = count(field(usage, 'output_tokens'));
  const inputDetails = field(usage, 'input_tokens_details');
  const cached = count(field(inputDetails, 'cached_tokens'));
  const writes = count(field(inputDetails, 'cache_write_tokens'));
  const reasoning = count(field(field(usage, 'output_tokens_details'), 'reasoning_tokens'));
  if (input === null || output === null || cached === null || writes === null || reasoning === null || reasoning > output) return null;
  const ttlDetails = field(inputDetails, 'cache_write_tokens_details');
  let cacheWrite30m = writes;
  let cacheWrite12h = 0;
  let ttl: AppliedRates['cacheWriteTtl'] = 'assumed_30m';
  if (ttlDetails !== undefined && ttlDetails !== null) {
    const short = count(field(ttlDetails, 'ttl_30m_tokens')) ?? 0;
    const long = count(field(ttlDetails, 'ttl_12h_tokens')) ?? 0;
    if (short + long !== writes) return null;
    cacheWrite30m = short; cacheWrite12h = long; ttl = 'reported';
  } else if (writes === 0) ttl = 'reported';
  const ordinary = input - cached - writes;
  if (ordinary < 0) return null;
  return {tokens: {input: ordinary, cachedInput: cached, cacheWrite30m, cacheWrite12h, output, reasoning}, ttl};
}

export function estimate(call: InferenceCall): CostEstimate | CostUnavailable {
  if (call.usage === null || call.usage === undefined) return 'usage_missing';
  const usage = tokens(call.usage);
  if (!usage || (call.searchCalls !== null && count(call.searchCalls) === null)) return 'usage_invalid';
  const model = call.model ? priced(call.model) : null;
  if (!model) return 'model_unpriced';
  const tier = call.serviceTier ? tiers[call.serviceTier] : undefined;
  const table = tier ? prices[model][tier] : undefined;
  if (!tier || !table) return 'tier_unknown';
  const totalInput = count(field(call.usage, 'input_tokens')) ?? 0;
  const context = totalInput > longContextThreshold ? 'long' : 'short';
  const rates: AppliedRates = {version:pricingVersion,source,currency:'USD',model,tier,context,...table[context],searchPerCall,cacheWriteTtl:usage.ttl};
  const searches = call.searchCalls ?? 0;
  const perToken = (value: number, perMillion: number) => value * perMillion / 1_000_000;
  const breakdown = {
    input: rounded(perToken(usage.tokens.input, rates.inputPerMillion)),
    cachedInput: rounded(perToken(usage.tokens.cachedInput, rates.cachedInputPerMillion)),
    cacheWrite30m: rounded(perToken(usage.tokens.cacheWrite30m, rates.cacheWrite30mPerMillion)),
    cacheWrite12h: rounded(perToken(usage.tokens.cacheWrite12h, rates.cacheWrite12hPerMillion)),
    output: rounded(perToken(usage.tokens.output, rates.outputPerMillion)),
    search: rounded(searches * searchPerCall),
  };
  return {tokens: usage.tokens, searches, rates, breakdown, costUsd: rounded(Object.values(breakdown).reduce((sum, value) => sum + value, 0))};
}
