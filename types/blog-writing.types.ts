import type { GeneratedArticle, Article } from '@/types/blog-article.types';
import type { Dossier, ResearchSource } from '@/types/blog-research.types';
import type { BlogRegionId } from '@/types/blog-selection.types';

export type WritingObserver = (response: unknown) => Promise<void>;
export interface WritingRequest {
  regionId: BlogRegionId;
  events: Array<{
    eventId: string;
    eventName: string;
    slug: string;
    dossier: Dossier;
    consultedSources: string[];
  }>;
}
// Names appear once; identifiers, slugs and provenance remain in the backend.
export interface WritingInput {
  regionName: string;
  events: Array<{eventName: string; dossier: Dossier}>;
}
export interface WritingResponse extends Article {
  references: Array<{eventName: string; excerpt: string; sourceIndexes: number[]}>;
}
export interface WritingResult extends GeneratedArticle {
  references: Array<{eventId: string; excerpt: string; sources: ResearchSource[]}>;
}
