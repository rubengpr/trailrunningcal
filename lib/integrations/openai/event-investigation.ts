import type { ResponseFunctionWebSearch } from 'openai/resources/responses/responses';
import { createOpenAIClient } from '@/lib/integrations/openai/client';
import { investigationInstructions } from '@/lib/blog/prompts/event-investigation';
import { dossierSchema, parseDossier, ResearchError, safeSourceUrl } from '@/lib/blog/research/result';
import type { ResearchInput, ResearchOutput, ResearchMetadata } from '@/types/blog-research.types';

export const researchModel = 'gpt-6.1-sol';

export async function investigateEvent(input: ResearchInput): Promise<ResearchOutput> {
  const started = Date.now();
  let metadata: ResearchMetadata | undefined;
  try {
    const response = await createOpenAIClient().responses.create({
      model: researchModel, reasoning: {effort: 'medium'}, max_output_tokens: 4000,
      instructions: investigationInstructions,
      input: JSON.stringify({regionName: input.regionName, eventName: input.eventName}),
      tools: [{type: 'web_search'}], tool_choice: 'required',
      include: ['web_search_call.action.sources'],
      text: {format: {type: 'json_schema', name: 'event_dossier', strict: true, schema: dossierSchema}},
    }, {timeout: 600_000, maxRetries: 0});
    metadata = {consultedSources:[],responseId:response.id,model:response.model,usage:response.usage,searchCalls:0,durationMs:Date.now()-started};
    if (response.output.some(item => item.type === 'message' && item.content.some(part => part.type === 'refusal'))) throw new ResearchError('refused');
    if (response.status !== 'completed') throw new ResearchError('incomplete');
    const searches = response.output.filter((item): item is ResponseFunctionWebSearch => item.type === 'web_search_call' && item.status === 'completed');
    if (!searches.length) throw new ResearchError('search_missing');
    const consultedSources = [...new Set(searches.flatMap(item => {
      const action = item.action;
      return action.type === 'search' ? (action.sources ?? []).map(source => source.url) : action.url ? [action.url] : [];
    }).map(safeSourceUrl).filter((url): url is string => url !== null))];
    metadata.consultedSources = consultedSources;
    metadata.searchCalls = searches.length;
    let value: unknown;
    try { value = JSON.parse(response.output_text); } catch { throw new ResearchError('invalid_result'); }
    return {
      dossier: parseDossier(value, input.eventName, consultedSources), consultedSources,
      responseId: response.id, model: response.model, usage: response.usage,
      searchCalls: searches.length, durationMs: Date.now() - started,
    };
  } catch (error) {
    if (error instanceof ResearchError) throw new ResearchError(error.code,metadata);
    console.error('Event investigation provider failed', {eventName: input.eventName, error});
    throw new ResearchError(error instanceof Error && /timeout|abort/i.test(error.name) ? 'timeout' : 'api_error');
  }
}
