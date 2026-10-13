import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export function BlogDraftSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-900 [&::-webkit-details-marker]:hidden">
        <h2 className="flex items-center gap-1 text-sm font-semibold">
          <ChevronRight aria-hidden="true" strokeWidth={2} className="size-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90" />
          {title}
        </h2>
      </summary>
      <div className="pl-5">{children}</div>
    </details>
  );
}
