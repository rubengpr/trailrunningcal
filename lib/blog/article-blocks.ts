import { DomUtils, parseDocument } from 'htmlparser2';
import { sanitizeContent } from '@/lib/blog/sanitize';
import { ValidationError } from '@/lib/errors';
import type { ArticleBlock, ImageBlock } from '@/types/blog-article-block.types';

export function textBlocks(html: string, links: readonly string[]): ArticleBlock[] {
  return parseDocument(sanitizeContent(html, links)).children
    .filter(node => node.type !== 'text' || node.data.trim())
    .map((node, index) => ({ id: `text-${index}`, type: 'text' as const, html: DomUtils.getOuterHTML(node, { encodeEntities: 'utf8' }) }));
}
export function insertImage(blocks: ArticleBlock[], image: ImageBlock, afterId: string | null): ArticleBlock[] {
  const index = afterId === null ? -1 : blocks.findIndex(block => block.id === afterId);
  if (afterId !== null && index < 0) throw new ValidationError('article_conflict', 409);
  return [...blocks.slice(0, index + 1), image, ...blocks.slice(index + 1)];
}
export function moveImage(blocks: ArticleBlock[], id: string, direction: 'up' | 'down'): ArticleBlock[] {
  const index = blocks.findIndex(block => block.id === id && block.type === 'image');
  if (index < 0) throw new ValidationError('Image not found', 404);
  const target = index + (direction === 'up' ? -1 : 1);
  if (target < 0 || target >= blocks.length) return blocks;
  const next = [...blocks]; [next[index], next[target]] = [next[target], next[index]];
  return next;
}
export function imageText(value: string, max: number): string {
  const text = value.trim();
  if (Array.from(text).length > max) throw new ValidationError('invalid_image_text', 422);
  return text;
}
