import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compose } from '@/lib/blog/writing/result';
import { prepare as prepareContext } from '@/lib/blog/writing/context';
import { prepare } from '@/lib/blog/editing/result';
import { writingRequest, writingResponse } from '@/tests/fixtures/blog-writing';
const mocks = vi.hoisted(() => ({ create: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/integrations/openai/client', () => ({ createOpenAIClient: mocks.client }));
import { edit } from '@/lib/services/blog-editing';
import { articleEditingInstructions, editingVoiceExamples } from '@/lib/blog/prompts/article-editing';
const request = { context: writingRequest, source: { ...compose(writingResponse, writingRequest, prepareContext(writingRequest).input), model: 'writer', responseId: 'source', durationMs: 1, usage: null } };
const input = prepare(request);
const value = { edits: input.blocks.filter(block => block.editable).map(block => ({id:block.id,markdown:block.markdown.trim()})), references: input.references.map(reference => ({id:reference.id,blockId:reference.blockIds[0],excerpt:reference.excerpt})) };
beforeEach(() => {
  vi.resetAllMocks(); mocks.client.mockReturnValue({ responses: { create: mocks.create } });
  mocks.create.mockResolvedValue({id:'edited',model:'gpt-6.1-sol',status:'completed',output:[],output_text:JSON.stringify(value),usage:{input_tokens:1000,output_tokens:500}});
});
describe('editor inference', () => {
  it('uses the tested model, voice examples, structured output and no tools in a single request', async () => {
    const observer = vi.fn();
    const result = await edit(request,observer);
    expect(mocks.create).toHaveBeenCalledOnce();
    const [body, options] = mocks.create.mock.calls[0];
    expect(body).toMatchObject({model:'gpt-6.1-sol',reasoning:{effort:'medium'},max_output_tokens:16000,instructions:articleEditingInstructions,store:false,text:{format:{strict:true}}});
    expect(JSON.parse(body.input)).toEqual({...input,voiceExamples:editingVoiceExamples});
    expect(body.tools).toBeUndefined(); expect(options).toEqual({timeout:120000,maxRetries:2});
    expect(observer).toHaveBeenCalledOnce(); expect(result.responseId).toBe('edited');
    expect(result.usage?.inputTokens).toBe(1000);
  });
  it.each([
    [{status:'incomplete',output:[],output_text:'{}'},'incomplete'],
    [{status:'completed',output:[{type:'message',content:[{type:'refusal'}]}],output_text:''},'refused'],
    [{status:'completed',output:[],output_text:'{'},'invalid_content'],
    [{status:'completed',output:[],output_text:'{}'},'invalid_content'],
  ])('captures invalid output without a repair request %#', async (response, code) => {
    mocks.create.mockResolvedValue(response); const observer = vi.fn();
    await expect(edit(request,observer)).rejects.toMatchObject({code});
    expect(observer).toHaveBeenCalledWith(response); expect(mocks.create).toHaveBeenCalledOnce();
  });
  it('validates context before making a paid call', async () => {
    await expect(edit({...request,context:{...writingRequest,events:[]}})).rejects.toMatchObject({code:'invalid_context'});
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it('returns safe provider errors', async () => {
    mocks.create.mockRejectedValue(new Error('private details'));
    await expect(edit(request)).rejects.toMatchObject({code:'api_error',message:'api_error'});
    expect(mocks.create).toHaveBeenCalledOnce();
  });
});
