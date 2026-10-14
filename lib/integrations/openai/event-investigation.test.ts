import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dossier } from '@/tests/fixtures/blog-research';
const mocks = vi.hoisted(() => ({create:vi.fn()}));
vi.mock('@/lib/integrations/openai/client',() => ({createOpenAIClient:() => ({responses:{create:mocks.create}})}));
import { investigateEvent } from './event-investigation';
const input = {regionName:'Cataluña',eventName:dossier.eventName};
function response(value:unknown = dossier) {
  return {id:'response',model:'gpt-6.1-sol',status:'completed',output:[
    {type:'web_search_call',status:'completed',action:{type:'search',sources:[{type:'url',url:dossier.sources[0].url}]}},
    {type:'web_search_call',status:'completed',action:{type:'open_page',url:dossier.sources[0].url}},
  ],output_text:JSON.stringify(value),usage:{input_tokens:100,output_tokens:200}};
}
beforeEach(() => {vi.resetAllMocks();mocks.create.mockResolvedValue(response());});
describe('event investigator request',() => {
  it('sends only region and name with mandatory search and strict JSON',async() => {
    const result = await investigateEvent(input);
    expect(result.dossier).toEqual(dossier);expect(result.consultedSources).toEqual([dossier.sources[0].url]);expect(result.searchCalls).toBe(2);
    const [body,options] = mocks.create.mock.calls[0];
    expect(JSON.parse(body.input)).toEqual(input);expect(body.model).toBe('gpt-6.1-sol');
    expect(body.reasoning).toEqual({effort:'medium'});expect(body.max_output_tokens).toBe(4000);
    expect(body.tools).toEqual([{type:'web_search',search_context_size:'high'}]);expect(body.tool_choice).toBe('required');
    expect(body.include).toEqual(['web_search_call.action.sources']);expect(body.text.format.strict).toBe(true);
    expect(options).toEqual({timeout:600000,maxRetries:0});
  });
  it.each([
    [{...response(),status:'incomplete'},'incomplete'],
    [{...response(),output:[{type:'message',content:[{type:'refusal'}]}]},'refused'],
    [{...response(),output:[]},'search_missing'],
    [{...response(),output_text:'{'},'invalid_result'],
    [response({...dossier,eventName:'Other event'}),'invalid_result'],
    [response({...dossier,sources:[{title:'Fake',url:'https://fake.example'}]}),'unverified_source'],
  ])('rejects invalid provider response %#',async(value,code) => {
    mocks.create.mockResolvedValue(value);await expect(investigateEvent(input)).rejects.toMatchObject({code});expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it('accepts honest insufficient research',async() => {
    const partial = {...dossier,context:'No se ha identificado con confianza el evento.',sources:[],observations:['Las búsquedas no permiten distinguir el evento.']};
    mocks.create.mockResolvedValue(response(partial));expect((await investigateEvent(input)).dossier).toEqual(partial);
  });
  it('maps API errors to safe codes',async() => {
    vi.spyOn(console,'error').mockImplementation(() => {});
    mocks.create.mockRejectedValue(Object.assign(new Error('private'),{name:'APIConnectionTimeoutError'}));
    await expect(investigateEvent(input)).rejects.toMatchObject({code:'timeout',message:'timeout'});
    vi.restoreAllMocks();
  });
});
it('retains request diagnostics when a declared source was not observed',async() => {
  mocks.create.mockResolvedValue(response({...dossier,sources:[{title:'Unknown',url:'https://other.example/page'}]}));
  await expect(investigateEvent(input)).rejects.toMatchObject({code:'unverified_source',metadata:{responseId:'response',searchCalls:2,consultedSources:[dossier.sources[0].url]}});
});
