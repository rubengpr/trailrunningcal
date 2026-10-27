import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({recordCall:vi.fn()}));
vi.mock('@/lib/services/blog-costs', () => mocks);
import { trackCost } from './blog-costs';

it('never lets a cost write failure change the workflow outcome', async () => {
  vi.spyOn(console,'error').mockImplementation(() => {});
  mocks.recordCall.mockRejectedValue(new Error('private DB details'));
  const entry = {key:'writing:draft',stage:'writing' as const,draftId:'draft',researchResultId:null,evaluationAttemptId:null,errorCode:null,call:{requestedModel:'m',model:null,serviceTier:null,responseId:null,responseStatus:null,usage:null,searchCalls:null}};
  await expect(trackCost(entry)).resolves.toBeUndefined();
  expect(console.error).toHaveBeenCalledWith('Blog cost tracking failed',{key:'writing:draft',stage:'writing'});
});
