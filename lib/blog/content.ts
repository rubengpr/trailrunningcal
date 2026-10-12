import { marked } from 'marked';
import { sanitizeContent } from '@/lib/blog/sanitize';
import type { Article, GenerationFailure } from '@/types/blog-article.types';

export class GenerationError extends Error {
  constructor(public readonly code: GenerationFailure) { super(code); }
}

export function parseArticle(value: unknown): Article {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new GenerationError('invalid_content');
  const fields = ['title', 'contentMarkdown', 'primaryKeyword', 'slug', 'seoTitle', 'metaDescription'] as const;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== fields.length) throw new GenerationError('invalid_content');
  const article = {} as Article;
  for (const field of fields) {
    const text = record[field];
    if (typeof text !== 'string' || !text.trim() || text.length > 100_000 ||
      /(?:https?:\/\/|www\.)/i.test(text)) throw new GenerationError('invalid_content');
    article[field] = text.trim();
    if (field !== 'contentMarkdown' && /<\/?[a-z][^>]*>/i.test(text)) throw new GenerationError('invalid_content');
  }
  article.slug = article.slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!article.slug) throw new GenerationError('invalid_content');
  return article;
}

export function renderContent(markdown: string): string {
  const tokens = marked.lexer(markdown, { gfm: true });
  let hasSection = false;
  marked.walkTokens(tokens, token => {
    if (['html', 'link', 'image', 'def', 'code', 'codespan'].includes(token.type) ||
      (token.type === 'list_item' && token.task)) throw new GenerationError('invalid_content');
    if (token.type === 'heading') {
      if (token.depth !== 2 && token.depth !== 3) throw new GenerationError('invalid_content');
      if (token.depth === 3 && !hasSection) throw new GenerationError('invalid_content');
      if (token.depth === 2) hasSection = true;
    }
  });
  if (!hasSection) throw new GenerationError('invalid_content');
  return sanitizeContent(marked.parser(tokens));
}
