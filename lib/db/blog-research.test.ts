import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({rpc:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn(),order:vi.fn(),range:vi.fn()}));
vi.mock('@/lib/supabase/server',() => ({createAdminClient:() => mocks}));
import { claim, listRuns } from './blog-research';
beforeEach(() => {vi.resetAllMocks();for(const method of ['from','select','eq','order'] as const)mocks[method].mockReturnValue(mocks);});
it.each([['P0002',404],['P0001',409],['22023',422]])('maps RPC domain errors %s',async(code,status) => {
  mocks.rpc.mockResolvedValue({error:{code},data:null});await expect(claim('draft',['event'],'openai','model')).rejects.toMatchObject({status});
});
it('uses stable history pagination with no internal response fields',async() => {
  mocks.range.mockResolvedValue({data:[],count:51,error:null});const value = await listRuns('draft',2);
  expect(value.pagination).toEqual({page:2,pageSize:50,total:51,totalPages:2});expect(mocks.range).toHaveBeenCalledWith(50,99);
  expect(mocks.order.mock.calls).toEqual([['created_at',{ascending:false}],['id',{ascending:false}]]);
  const columns=mocks.select.mock.calls[0][0];expect(columns).not.toContain('workflow_run_id');expect(columns).not.toContain('response_id');expect(columns).not.toContain('usage');
});
