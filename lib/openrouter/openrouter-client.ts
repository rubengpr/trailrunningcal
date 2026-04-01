import OpenAI from 'openai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export function requireOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }
  return apiKey;
}

/**
 * Optional OpenRouter app-attribution headers (see https://openrouter.ai/docs/app-attribution).
 * When HTTP-Referer is localhost, set OPENROUTER_APP_TITLE so usage is tracked.
 */
function optionalOpenRouterHeaders(): Record<string, string> | undefined {
  const referer = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const title = process.env.OPENROUTER_APP_TITLE?.trim();
  const categoriesRaw = process.env.OPENROUTER_APP_CATEGORIES?.trim();

  const categories =
    categoriesRaw && categoriesRaw.length > 0
      ? categoriesRaw
          .split(',')
          .map((segment) => segment.trim())
          .filter((segment) => segment.length > 0)
          .join(',')
      : '';

  if (!referer && !title && !categories) {
    return undefined;
  }

  const headers: Record<string, string> = {};
  if (referer) {
    headers['HTTP-Referer'] = referer;
  }
  if (title) {
    headers['X-OpenRouter-Title'] = title;
  }
  if (categories) {
    headers['X-OpenRouter-Categories'] = categories;
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
