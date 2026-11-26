export const BLOG_CATEGORIES = ['races', 'gear', 'sponsored'] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export function isBlogCategory(value: unknown): value is BlogCategory {
  return BLOG_CATEGORIES.includes(value as BlogCategory);
}
