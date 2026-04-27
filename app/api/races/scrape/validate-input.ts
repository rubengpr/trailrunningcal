import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth-admin';
import {
  isOpenRouterScrapeModelId,
  isOpenRouterVisionModelId,
} from '@/lib/openrouter/scrape-models';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/openrouter/scrape-models';
import { isScrapePipelineMode, type ScrapePipelineMode } from '@/types/races-scrape-api.types';
import { MAX_SCRAPE_MARKDOWN_BYTES } from '@/lib/scrape-markdown-limits';

export class ValidationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export type ParsedInput =
  | { mode: 'crawlOnly'; url: string }
  | { mode: 'scrapeOnly'; url: string }
  | { mode: 'llmFromMarkdown'; markdown: string; model: OpenRouterScrapeModelId }
  | { mode: 'crawlAndLlm'; url: string; model: OpenRouterScrapeModelId }
  | { mode: 'llmFromImages'; images: string[]; model: OpenRouterVisionModelId };

export async function assertAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user || !isAdminEmail(user.email)) {
    throw new ValidationError('Unauthorized', 401);
  }
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function resolveMode(
  bodyMode: unknown,
  hasUrl: boolean,
  hasMarkdown: boolean,
): ScrapePipelineMode | null {
  if (bodyMode !== undefined && bodyMode !== null && bodyMode !== '') {
    return isScrapePipelineMode(bodyMode) ? bodyMode : null;
  }
  if (hasMarkdown) return 'llmFromMarkdown';
  if (hasUrl) return 'crawlAndLlm';
  return null;
}

const MAX_IMAGES = 5;

export function parseInput(body: unknown): ParsedInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const { websiteUrl, markdown, model, mode: bodyMode, images } = body as Record<string, unknown>;

  const url = typeof websiteUrl === 'string' ? websiteUrl.trim() : '';
  const markdownStr = typeof markdown === 'string' ? markdown.trim() : '';
  const hasUrl = url.length > 0;
  const hasMarkdown = markdownStr.length > 0;

  if (hasUrl && hasMarkdown) {
    throw new ValidationError('Provide either a website URL or markdown, not both', 400);
  }

  const mode = resolveMode(bodyMode, hasUrl, hasMarkdown);

  if (mode === null) {
    if (bodyMode !== undefined && bodyMode !== null && bodyMode !== '' && !isScrapePipelineMode(bodyMode)) {
      throw new ValidationError('Invalid mode', 400);
    }
    throw new ValidationError('Website URL or markdown is required', 400);
  }

  if (mode === 'crawlOnly') {
    if (!hasUrl) throw new ValidationError('Website URL is required for crawl-only mode', 400);
    return { mode, url };
  }

  if (mode === 'scrapeOnly') {
    if (!hasUrl) throw new ValidationError('Website URL is required for scrape-only mode', 400);
    return { mode, url };
  }

  if (mode === 'llmFromImages') {
    if (!Array.isArray(images) || images.length === 0) {
      throw new ValidationError('At least one image is required', 400);
    }
    if (images.length > MAX_IMAGES) {
      throw new ValidationError(`Maximum ${MAX_IMAGES} images per request`, 400);
    }
    for (const img of images) {
      if (typeof img !== 'string' || !img.startsWith('data:image/')) {
        throw new ValidationError('Invalid image format', 400);
      }
    }
    const isModelMissing = typeof model !== 'string' || model === '';
    if (isModelMissing || !isOpenRouterVisionModelId(model)) {
      throw new ValidationError(isModelMissing ? 'Model is required' : 'Invalid vision model', 400);
    }
    return { mode, images: images as string[], model };
  }

  // llmFromMarkdown or crawlAndLlm
  const isModelMissing = typeof model !== 'string' || model === '';
  if (isModelMissing || !isOpenRouterScrapeModelId(model)) {
    throw new ValidationError(isModelMissing ? 'Model is required' : 'Invalid model', 400);
  }

  if (mode === 'llmFromMarkdown') {
    if (!hasMarkdown) throw new ValidationError('Markdown is required for this mode', 400);
    if (utf8ByteLength(markdownStr) > MAX_SCRAPE_MARKDOWN_BYTES) {
      throw new ValidationError('Markdown content is too large', 400);
    }
    return { mode, markdown: markdownStr, model };
  }

  // crawlAndLlm
  if (!hasUrl) throw new ValidationError('Website URL is required for this mode', 400);
  return { mode, url, model };
}
