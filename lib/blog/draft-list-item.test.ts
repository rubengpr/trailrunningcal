import {describe,it,expect} from 'vitest';
import {listItem} from './draft-list-item';
import type {DraftSummaryRow} from '@/types/blog-draft-record.types';
const base:DraftSummaryRow={id:'id',title:'Secret title',instructions:'Private instructions',status:'running',created_at:new Date().toISOString(),evaluation_status:'not_evaluated',evaluation:null};
describe('list disclosure boundary',()=>{
  it.each(['queued','running','failed'] as const)('withholds all article data for %s',status=>{
    const item=listItem({...base,status});
    for(const key of ['title','instructions','createdAt','score','evaluationStatus','contentHtml']) expect(item).not.toHaveProperty(key);
  });
  it('derives research progress and writing stage without another persisted status',()=>{
    expect(listItem({...base,generation_research:{status:'running',results:[{status:'completed'},{status:'failed'},{status:'running'}]}})).toMatchObject({stage:'researching',progress:{finished:2,total:3}});
    expect(listItem({...base,generation_research:{status:'partial',results:[]}})).toMatchObject({stage:'writing',progress:null});
  });
  it('exposes completed article even during evaluation',()=>{
    expect(listItem({...base,status:'completed',evaluation_status:'running'})).toMatchObject({title:'Secret title',evaluationStatus:'running',score:null});
  });
});
