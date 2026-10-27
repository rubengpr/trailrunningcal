'use client';
import type { SelectionContext } from '@/types/blog-selection.types';

import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';
import { BlogDraftSection } from '@/components/admin/blog-draft-section';

export function BlogDraftInstructions({ instructions, context }: {
  instructions: string; context?: SelectionContext | null;
}) {
  const t = useTranslations('admin.blog');
  return (
    <BlogDraftSection title={t(context ? 'selection.heading' : 'instructions')}>
      {context ? <div className="mt-3">
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
          <MapPin aria-hidden="true" strokeWidth={2} className="size-3 text-gray-400" />{context.regionName}
        </span>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {context.events.map(event => <li key={event.id} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700">{event.name}</li>)}
        </ul>
      </div> : <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">{instructions}</p>}
    </BlogDraftSection>
  );
}
