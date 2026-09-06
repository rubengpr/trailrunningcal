import OpenAI from 'openai';
import { observeLangfuseOpenAI } from '@/lib/integrations/langfuse/tracing';
import { requireApiKey } from '@/lib/integrations/utils';

export function createOpenAIClient(
  apiKey: string = requireApiKey('OPENAI_API_KEY'),
): OpenAI {
  return observeLangfuseOpenAI(new OpenAI({ apiKey, timeout: 15_000 }), {
    generationMetadata: { provider: 'openai' },
    tags: ['provider:openai'],
  });
}
