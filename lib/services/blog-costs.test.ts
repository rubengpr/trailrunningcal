import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationError } from '@/lib/blog/content';
import { WritingError } from '@/lib/blog/writing/context';
const mocks = vi.hoisted(() => ({record:vi.fn()}));
vi.mock('@/lib/db/blog-costs', () => mocks);
import { callStatus, recordCall, tracker } from './blog-costs';

const usage = {input_tokens:10,output_tokens:2,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}};
const response = {id:'response',model:'gpt-6.1-sol',service_tier:'default',status:'completed',usage,output:[]};
beforeEach(() => vi.resetAllMocks());

describe('cost tracker', () => {
  it('keeps the observed response even when validation later fails', async () => {
    const tracked = tracker('writing');
    await tracked.observe(response);
    expect(tracked.call(new GenerationError('invalid_content'))).toMatchObject({responseId:'response',usage});
  });
  it('records requests without a response as unknown consumption', () => {
    expect(tracker('evaluation').call(new GenerationError('timeout'))).toMatchObject({requestedModel:'gpt-6.1-sol',usage:null});
  });
  it('ignores failures before any request', () => {
    expect(tracker('writing').call(new WritingError('invalid_context'))).toBeNull();
  });
  it('derives the call status independently from the step outcome', () => {
    const call = {requestedModel:'gpt-6.1-sol',model:null,serviceTier:null,responseId:null,responseStatus:'incomplete',usage:null,searchCalls:null};
    expect(callStatus({errorCode:null,call})).toBe('succeeded');
    expect(callStatus({errorCode:'incomplete',call})).toBe('incomplete');
    expect(callStatus({errorCode:'api_error',call:{...call,responseStatus:null}})).toBe('failed');
  });
  it('persists the estimate resolved at record time', async () => {
    const tracked = tracker('writing');
    await tracked.observe(response);
    const entry = {key:'writing:draft',stage:'writing' as const,draftId:'draft',researchResultId:null,evaluationAttemptId:null,errorCode:null,call:tracked.call()!};
    await recordCall(entry);
    expect(mocks.record).toHaveBeenCalledWith(entry,'succeeded',expect.objectContaining({costUsd:0.00004}));
    await recordCall({...entry,call:{...entry.call,usage:null}});
    expect(mocks.record).toHaveBeenLastCalledWith(expect.anything(),'succeeded','usage_missing');
  });
});
