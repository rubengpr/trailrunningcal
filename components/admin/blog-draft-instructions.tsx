'use client';
import type { SelectionContext } from '@/types/blog-selection.types';

import { useTranslations } from 'next-intl';
import { BlogDraftSection } from '@/components/admin/blog-draft-section';

export function BlogDraftInstructions({ instructions, context }: {
  instructions: string; context?: SelectionContext | null;
}) {
  const t = useTranslations('admin.blog');
  return (
    <BlogDraftSection title={t(context ? 'selection.heading' : 'instructions')}>
      {context ? <div className="mt-2 text-sm leading-relaxed text-gray-600"><p>{context.regionName}</p><ul className="mt-2 space-y-1">{context.events.map(event => <li key={event.id}>{event.name}</li>)}</ul></div> : <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">{instructions}</p>}
    </BlogDraftSection>
  );
}
