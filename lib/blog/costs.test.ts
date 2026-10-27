import { describe, expect, it } from 'vitest';
import { summarize } from './costs';
import { run } from '@/tests/fixtures/blog-research';
import type { CostRow } from '@/types/blog-cost.types';

const tokens = {input:100,cachedInput:0,cacheWrite30m:0,cacheWrite12h:0,output:10,reasoning:5};
const row = (overrides: Partial<CostRow>): CostRow => ({id:'row',stage:'writing',research_result_id:null,status:'succeeded',requested_model:'gpt-6.1-sol',model:'gpt-6.1-sol',tokens,search_calls:0,cost_usd:'0.10000000',created_at:'2026-10-21T10:00:00Z',...overrides});
const research = {...run,status:'completed' as const,results:run.results.map(result => ({...result,status:'completed' as const}))};
const draft = {id:'draft',status:'completed' as const,research,evaluationStatus:'completed' as const,evaluationErrorCode:null};

describe('cost summary', () => {
  it('adds subtotals and the total from recorded calls', () => {
    const summary = summarize(draft, [
      row({id:'r0',stage:'research',research_result_id:'result-0',cost_usd:'0.21441240',search_calls:7}),
      row({id:'r1',stage:'research',research_result_id:'result-1',cost_usd:0.1}),
      row({id:'w'}),
      row({id:'e1',stage:'evaluation',status:'failed',cost_usd:'0.00000010'}),
      row({id:'e2',stage:'evaluation',cost_usd:'0.2'}),
    ]);
    expect(summary).toMatchObject({costUsd:0.6144125,partial:false});
    expect(summary.groups.map(group => [group.stage,group.costUsd,group.partial])).toEqual([['research',0.3144124,false],['writing',0.1,false],['evaluation',0.2000001,false]]);
    expect(summary.groups[0].lines.map(line => [line.eventName,line.searches])).toEqual([[run.results[0].eventName,7],[run.results[1].eventName,0]].sort((a,b) => String(a[0]).localeCompare(String(b[0]),'es')));
    expect(summary.groups[2].lines.map(line => [line.attempt,line.status])).toEqual([[1,'failed'],[2,'succeeded']]);
  });
  it('marks unknown consumption as partial instead of zero', () => {
    const summary = summarize(draft, [row({id:'w'}),row({id:'r0',stage:'research',research_result_id:'result-0',cost_usd:null,tokens:null})]);
    expect(summary.partial).toBe(true);
    expect(summary.costUsd).toBe(0.1);
    const researchGroup = summary.groups[0];
    expect(researchGroup.partial).toBe(true);
    expect(researchGroup.costUsd).toBeNull();
    expect(researchGroup.lines).toHaveLength(2);
    expect(researchGroup.lines.every(line => line.costUsd === null)).toBe(true);
  });
  it('treats legacy drafts without records as unknown', () => {
    const summary = summarize({...draft,research:null}, []);
    expect(summary).toMatchObject({costUsd:null,partial:true});
    expect(summary.groups.map(group => group.lines.length)).toEqual([0,1,1]);
  });
  it('does not invent evaluation calls that never reached the model', () => {
    expect(summarize({...draft,research:null,evaluationStatus:'not_evaluated'}, [row({})]).groups[2].lines).toEqual([]);
    expect(summarize({...draft,research:null,evaluationStatus:'failed',evaluationErrorCode:'start_failed'}, [row({})]).partial).toBe(false);
    expect(summarize({...draft,research:null,evaluationStatus:'failed',evaluationErrorCode:'timeout'}, [row({})]).partial).toBe(true);
  });
});
