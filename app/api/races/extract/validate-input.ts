import { isOpenRouterScrapeModelId, isOpenRouterVisionModelId } from '@/lib/providers/openrouter/scrape-models';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/providers/openrouter/scrape-models';
import { MAX_SCRAPE_MARKDOWN_BYTES } from '@/lib/scrape-markdown-limits';
import { ValidationError } from '@/lib/errors';
export { ValidationError };

export type ParsedInput =
  | { mode: 'markdown'; markdown: string; model: OpenRouterScrapeModelId }
  | { mode: 'images'; images: string[]; model: OpenRouterVisionModelId };

const MAX_IMAGES = 5;

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function parseInput(body: unknown): ParsedInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const { markdown, model, images } = body as Record<string, unknown>;

  if (Array.isArray(images)) {
    if (images.length === 0) throw new ValidationError('At least one image is required', 400);
    if (images.length > MAX_IMAGES) throw new ValidationError(`Maximum ${MAX_IMAGES} images per request`, 400);
    for (const img of images) {
      if (typeof img !== 'string' || !img.startsWith('data:image/')) {
        throw new ValidationError('Invalid image format', 400);
      }
    }
    const isModelMissing = typeof model !== 'string' || model === '';
    if (isModelMissing || !isOpenRouterVisionModelId(model)) {
      throw new ValidationError(isModelMissing ? 'Model is required' : 'Invalid vision model', 400);
    }
    return { mode: 'images', images: images as string[], model };
  }

  const markdownStr = typeof markdown === 'string' ? markdown.trim() : '';
  if (!markdownStr) throw new ValidationError('Markdown or images are required', 400);
  if (utf8ByteLength(markdownStr) > MAX_SCRAPE_MARKDOWN_BYTES) {
    throw new ValidationError('Markdown content is too large', 400);
  }
  const isModelMissing = typeof model !== 'string' || model === '';
  if (isModelMissing || !isOpenRouterScrapeModelId(model)) {
    throw new ValidationError(isModelMissing ? 'Model is required' : 'Invalid model', 400);
  }
  return { mode: 'markdown', markdown: markdownStr, model };
}
