import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inspect } from '@/lib/blog/scoring/rules';
import type { ScoringInput } from '@/types/blog-evaluation.types';
const mocks = vi.hoisted(() => ({create:vi.fn()}));
vi.mock('@/lib/integrations/openai/client',()=>({createOpenAIClient:()=>({responses:{create:mocks.create}})}));
import { evaluateArticle } from './article-evaluation';
const input:ScoringInput = {
  instructions:'Explica cómo elegir una carrera.',title:'Cómo elegir una carrera de trail',
  contentHtml:'<h2>Distancia</h2><p>Revisa el perfil.</p>',primaryKeyword:'carrera de trail',
  slug:'elegir-carrera-trail',seoTitle:'Cómo elegir una carrera',metaDescription:'Compara el perfil.',
};
beforeEach(()=>vi.resetAllMocks());
describe('evaluator request',()=>{
  it('uses the shared client with fixed limits and sends text, not HTML',async()=>{
    mocks.create.mockResolvedValue({status:'completed',output:[],output_text:'{"criteria":[]}'});
    expect(await evaluateArticle(input,inspect(input))).toEqual({criteria:[]});
    const [body,options]=mocks.create.mock.calls[0];
    expect(body.model).toBe('gpt-6.1-sol');
    expect(body.reasoning).toEqual({effort:'medium'});
    expect(body.max_output_tokens).toBe(4000);
    expect(body.text.format.strict).toBe(true);
    expect(options).toEqual({timeout:120000,maxRetries:2});
    const payload=JSON.parse(body.input);
    expect(payload.instructions).toBe(input.instructions);
    expect(payload.article).toBe('Distancia Revisa el perfil.');
    expect(payload.contentHtml).toBeUndefined();
    expect(payload.checks.points.structure).toBe(5);
  });
  it.each([
    [{status:'completed',output:[{type:'message',content:[{type:'refusal'}]}],output_text:''},'refused'],
    [{status:'incomplete',output:[],output_text:'{}'},'incomplete'],
    [{status:'completed',output:[],output_text:'{'},'invalid_evaluation'],
  ])('rejects invalid responses %#',async(response,code)=>{
    mocks.create.mockResolvedValue(response);
    await expect(evaluateArticle(input,inspect(input))).rejects.toMatchObject({code});
  });
  it('hides provider errors without extra calls',async()=>{
    mocks.create.mockRejectedValue(new Error('Secret provider details'));
    await expect(evaluateArticle(input,inspect(input))).rejects.toMatchObject({code:'api_error',message:'api_error'});
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it('identifies timeouts',async()=>{
    mocks.create.mockRejectedValue(Object.assign(new Error(),{name:'APIConnectionTimeoutError'}));
    await expect(evaluateArticle(input,inspect(input))).rejects.toMatchObject({code:'timeout'});
  });
});
