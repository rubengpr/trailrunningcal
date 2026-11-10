'use client';
import { useRef, useState } from 'react';
import { downloadDraft } from '@/lib/api/blog-export';

export function useBlogExport(id: string) {
  const lock = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (lock.current) return;
    lock.current = true; setSending(true); setError(null);
    try { await downloadDraft(id); }
    catch (error) {
      const code = error instanceof Error ? error.message : '';
      setError(['article_incomplete', 'missing_metadata', 'missing_publication', 'missing_cover', 'empty_article', 'missing_alt', 'invalid_images', 'invalid_document'].includes(code) ? code : 'export_failed');
    } finally { lock.current = false; setSending(false); }
  }
  return { sending, error, submit, clearError: () => setError(null) };
}
