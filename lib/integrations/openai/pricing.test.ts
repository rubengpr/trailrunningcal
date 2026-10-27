import { describe, expect, it } from 'vitest';
import { estimate, pricingVersion, tokens } from './pricing';
import type { CostEstimate, InferenceCall } from '@/types/blog-cost.types';

const usage = {input_tokens:65264,output_tokens:2391,total_tokens:67655,input_tokens_details:{cached_tokens:5284,cache_write_tokens:28},output_tokens_details:{reasoning_tokens:814}};
const call = (overrides: Partial<InferenceCall> = {}): InferenceCall => ({requestedModel:'gpt-6.1-sol',model:'gpt-6.1-sol',serviceTier:'default',responseId:'response',responseStatus:'completed',usage,searchCalls:7,...overrides});
const priced = (value: ReturnType<typeof estimate>): CostEstimate => {
  if (typeof value === 'string') throw new Error(value);
  return value;
};

describe('OpenAI cost estimate', () => {
  it('splits input into exclusive categories and keeps reasoning inside output', () => {
    const result = priced(estimate(call()));
    expect(result.tokens).toEqual({input:59952,cachedInput:5284,cacheWrite30m:28,cacheWrite12h:0,output:2391,reasoning:814});
    expect(result.breakdown).toEqual({input:0.119904,cachedInput:0.0005284,cacheWrite30m:0.00007,cacheWrite12h:0,output:0.02391,search:0.07});
    expect(result.costUsd).toBe(0.2144124);
  });
  it('snapshots the applied rates, version and assumption', () => {
    expect(priced(estimate(call())).rates).toEqual({
      version:pricingVersion,source:'https://developers.openai.com/api/docs/pricing',currency:'USD',model:'gpt-6.1-sol',tier:'standard',context:'short',
      inputPerMillion:2,cachedInputPerMillion:0.1,cacheWrite30mPerMillion:2.5,cacheWrite12hPerMillion:5,outputPerMillion:10,searchPerCall:0.01,cacheWriteTtl:'assumed_30m',
    });
  });
  it('prices reported cache write lifetimes separately', () => {
    const result = priced(estimate(call({searchCalls:0,usage:{...usage,input_tokens:100,output_tokens:0,input_tokens_details:{cached_tokens:0,cache_write_tokens:100,cache_write_tokens_details:{ttl_30m_tokens:40,ttl_12h_tokens:60}},output_tokens_details:{reasoning_tokens:0}}})));
    expect(result.rates.cacheWriteTtl).toBe('reported');
    expect(result.breakdown).toMatchObject({input:0,cacheWrite30m:0.0001,cacheWrite12h:0.0003});
    expect(result.costUsd).toBe(0.0004);
  });
  it('charges searches only as reported search actions and adds no extra content fee', () => {
    expect(priced(estimate(call({searchCalls:0}))).breakdown.search).toBe(0);
    expect(priced(estimate(call({searchCalls:null}))).searches).toBe(0);
    expect(priced(estimate(call({searchCalls:3}))).costUsd).toBe(0.1744124);
  });
  it('applies long context rates above 272K input tokens', () => {
    const result = priced(estimate(call({searchCalls:0,usage:{input_tokens:300_000,output_tokens:1000,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}}})));
    expect(result.rates.context).toBe('long');
    expect(result.costUsd).toBe(1.215);
  });
  it('uses the effective tier and dated snapshot of the response', () => {
    expect(priced(estimate(call({serviceTier:'flex'}))).rates.inputPerMillion).toBe(1);
    expect(priced(estimate(call({serviceTier:'priority'}))).rates.tier).toBe('fast');
    expect(priced(estimate(call({model:'gpt-6.1-sol-2026-09-30'}))).rates.model).toBe('gpt-6.1-sol');
  });
  it('rounds to eight decimals without losing tiny amounts', () => {
    const result = priced(estimate(call({searchCalls:0,usage:{input_tokens:1,output_tokens:0,input_tokens_details:{cached_tokens:1,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}}})));
    expect(result.costUsd).toBe(0.0000001);
    const third = priced(estimate(call({searchCalls:0,usage:{input_tokens:3,output_tokens:3,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}}})));
    expect(third.costUsd).toBe(0.000036);
  });
  it('never turns missing or inconsistent usage into zero', () => {
    expect(estimate(call({usage:null}))).toBe('usage_missing');
    expect(estimate(call({usage:{...usage,input_tokens_details:{cached_tokens:5284}}}))).toBe('usage_invalid');
    expect(estimate(call({usage:{...usage,input_tokens:10}}))).toBe('usage_invalid');
    expect(estimate(call({usage:{...usage,output_tokens_details:{reasoning_tokens:9999}}}))).toBe('usage_invalid');
    expect(estimate(call({usage:{...usage,input_tokens_details:{cached_tokens:0,cache_write_tokens:10,cache_write_tokens_details:{ttl_30m_tokens:1,ttl_12h_tokens:1}}}}))).toBe('usage_invalid');
    expect(estimate(call({searchCalls:-1}))).toBe('usage_invalid');
  });
  it('refuses to guess unknown models or tiers', () => {
    expect(estimate(call({model:'gpt-7'}))).toBe('model_unpriced');
    expect(estimate(call({model:null}))).toBe('model_unpriced');
    expect(estimate(call({serviceTier:'scale'}))).toBe('tier_unknown');
    expect(estimate(call({serviceTier:null}))).toBe('tier_unknown');
  });
  it('rejects non-integer token counts', () => {
    expect(tokens({...usage,output_tokens:1.5})).toBeNull();
  });
});
