'use client';
import { useRef, useState } from 'react';
import { ArticleImageError } from '@/lib/api/blog-article-images';
import type { ArticleDocument } from '@/types/blog-article-block.types';

export function useBlogArticleImages(onSaved: (document: ArticleDocument) => void) {
  const lock = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(operation: () => Promise<ArticleDocument>): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true; setSending(true); setError(null);
    try { onSaved(await operation()); return true; }
    catch (error) {
      const codes = ['invalid_image', 'image_too_large', 'invalid_image_text', 'article_conflict'];
      setError(error instanceof ArticleImageError && codes.includes(error.code) ? error.code : 'save_failed');
      return false;
    } finally { lock.current = false; setSending(false); }
  }
  return { sending, error, setError, submit };
}
