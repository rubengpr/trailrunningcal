import OpenAI from 'openai';
import { requireApiKey } from '@/lib/integrations/utils';

export function createOpenAIClient(
  apiKey: string = requireApiKey('OPENAI_API_KEY'),
): OpenAI {
  return new OpenAI({ apiKey, timeout: 15_000 });
}
