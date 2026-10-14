import { GEOGRAPHY } from '@/lib/geography/destinations';
import type { SelectionContext } from '@/types/blog-selection.types';

export function eventPath(slug: string): string { return `/es/e/${encodeURIComponent(slug)}`; }
export function calendarPath(context: SelectionContext): string { return `/es/d/${GEOGRAPHY.regions[context.regionId].slug}`; }
export function allowedLinks(context?: SelectionContext | null): string[] {
  return context ? [...context.events.map(event => eventPath(event.slug)), calendarPath(context)] : [];
}
