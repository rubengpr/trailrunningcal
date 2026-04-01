import OpenAI from 'openai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export function requireOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }
  return apiKey;
}

function optionalOpenRouterHeaders(): Record<string, string> | undefined {
  const referer = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const title = process.env.OPENROUTER_APP_TITLE?.trim();
  if (!referer && !title) {
    return undefined;
  }
  const headers: Record<string, string> = {};
  if (referer) {
    headers['HTTP-Referer'] = referer;
  }
  if (title) {
    headers['X-Title'] = title;
  }
  return headers;
}

export function createOpenRouterClient(
  apiKey: string = requireOpenRouterApiKey(),
): OpenAI {
  const defaultHeaders = optionalOpenRouterHeaders();
  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    ...(defaultHeaders ? { defaultHeaders } : {}),
  });
}
