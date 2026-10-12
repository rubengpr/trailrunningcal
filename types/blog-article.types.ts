export interface Article {
  title: string;
  contentMarkdown: string;
  primaryKeyword: string;
  slug: string;
  seoTitle: string;
  metaDescription: string;
}

export interface GeneratedArticle {
  article: Article;
  contentHtml: string;
  model: string;
  responseId: string;
  durationMs: number;
  usage: { inputTokens: number; outputTokens: number; reasoningTokens: number } | null;
}

export type GenerationFailure = 'timeout' | 'api_error' | 'refused' | 'incomplete' | 'invalid_content';
