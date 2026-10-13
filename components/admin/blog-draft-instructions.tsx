'use client';

import { useTranslations } from 'next-intl';
import { BlogDraftSection } from '@/components/admin/blog-draft-section';

export function BlogDraftInstructions({ instructions }: {
  instructions: string;
}) {
  const t = useTranslations('admin.blog');
  return (
    <BlogDraftSection title={t('instructions')}>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">{instructions}</p>
    </BlogDraftSection>
  );
}
