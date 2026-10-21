import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({rpc:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn(),is:vi.fn(),order:vi.fn(),range:vi.fn()}));
vi.mock('@/lib/supabase/server',() => ({createAdminClient:() => mocks}));
import { claim, listRuns } from './blog-research';
beforeEach(() => {vi.resetAllMocks();for(const method of ['from','select','eq','is','order'] as const)mocks[method].mockReturnValue(mocks);});
it.each([['P0002',404],['P0001',409],['22023',422]])('maps RPC domain errors %s',async(code,status) => {
  mocks.rpc.mockResolvedValue({error:{code},data:null});await expect(claim('draft',['event'],'openai','model')).rejects.toMatchObject({status});
});
it('uses stable history pagination with no internal response fields',async() => {
  mocks.range.mockResolvedValue({data:[],count:51,error:null});const value = await listRuns('draft',2);
  expect(value.pagination).toEqual({page:2,pageSize:50,total:51,totalPages:2});expect(mocks.range).toHaveBeenCalledWith(50,99);
  expect(mocks.order.mock.calls).toEqual([['created_at',{ascending:false}],['id',{ascending:false}]]);
  const columns=mocks.select.mock.calls[0][0];expect(columns).not.toContain('workflow_run_id');expect(columns).not.toContain('response_id');expect(columns).not.toContain('usage');
});

it('filters standalone history independently of draft histories',async() => {
  mocks.range.mockResolvedValue({data:[],count:0,error:null});await listRuns(null,1);
  expect(mocks.is).toHaveBeenCalledWith('draft_id',null);expect(mocks.eq).not.toHaveBeenCalled();
});

it('returns region and event identities without persisted input or ordering metadata',async() => {
  const result = (id:string,name:string) => ({id,event_id:id,event_name:name,status:'completed',dossier:null,consulted_sources:[],error_code:null,started_at:null,finished_at:null});
  mocks.range.mockResolvedValue({data:[{id:'run',draft_id:null,region_id:'catalonia',provider:'openai',model:'test',status:'completed',created_at:'date',finished_at:null,error_code:null,results:[result('z','Zeta'),result('b','Alfa'),result('a','Alfa')]}],count:1,error:null});
  const run = (await listRuns(null,1)).runs[0];
  expect(run.regionId).toBe('catalonia');expect(run.regionName).toBe('Cataluña');
  expect(run).not.toHaveProperty('input');expect(run.results.map(result => result.eventId)).toEqual(['a','b','z']);
  expect(run.results[0]).not.toHaveProperty('position');
});
