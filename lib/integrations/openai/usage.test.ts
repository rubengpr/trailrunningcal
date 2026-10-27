import { describe, expect, it } from 'vitest';
import { captureCall } from './usage';

describe('captureCall', () => {
  it('keeps original usage and counts only completed search actions', () => {
    const usage = {input_tokens:10,output_tokens:2,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:1},extra:true};
    const call = captureCall('gpt-6.1-sol', {id:'response',model:'gpt-6.1-sol-2026-09-30',service_tier:'default',status:'incomplete',usage,output:[
      {type:'web_search_call',status:'completed',action:{type:'search',query:'q'}},
      {type:'web_search_call',status:'completed',action:{type:'open_page',url:'https://example.com'}},
      {type:'web_search_call',status:'completed',action:{type:'find_in_page',url:'https://example.com',pattern:'x'}},
      {type:'web_search_call',status:'failed',action:{type:'search',query:'q'}},
      {type:'message',content:[]},
    ]});
    expect(call).toEqual({requestedModel:'gpt-6.1-sol',model:'gpt-6.1-sol-2026-09-30',serviceTier:'default',responseId:'response',responseStatus:'incomplete',usage,searchCalls:1});
  });
  it('leaves consumption unknown when no response exists', () => {
    expect(captureCall('gpt-6.1-sol')).toEqual({requestedModel:'gpt-6.1-sol',model:null,serviceTier:null,responseId:null,responseStatus:null,usage:null,searchCalls:null});
  });
});
