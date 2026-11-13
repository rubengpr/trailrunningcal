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
    dossier: Dossier | null;
    consultedSources: string[];
  }>;
}
// Names appear once; identifiers, slugs and provenance remain in the backend.
export interface RecentIntroduction {
  title: string;
  introduction: string;
}
export interface WritingInput {
  recentIntroductions?: RecentIntroduction[];
  regionName: string;
  events: Array<{eventName: string; dossier: Dossier | null}>;
}
export interface WritingResponse extends Article {
  references: Array<{eventName: string; excerpt: string; sourceIndexes: number[]}>;
}
export type QualityField = 'title' | 'contentMarkdown' | 'primaryKeyword' | 'slug' | 'seoTitle' | 'metaDescription' | 'introduction';
export type QualityObservation =
  | {code:'length_out_of_range';field:Exclude<QualityField,'introduction'>;unit:'characters'|'words';actual:number;min:number;max:number}
  | {code:'keyword_missing';field:'title'|'introduction'|'slug'|'seoTitle'|'metaDescription'}
  | {code:'repeated_paragraph';field:'contentMarkdown';eventId:string;relatedEventIds:string[];excerpt:string};
export interface WritingQuality {
  metrics: {
    wordCount:number;
    keywordWordCount:number;
    slugWordCount:number;
    characters:Record<'title'|'slug'|'seoTitle'|'metaDescription',number>;
  };
  observations:QualityObservation[];
}
export interface WritingResult extends GeneratedArticle {
  quality:WritingQuality;
  references: Array<{eventId: string; excerpt: string; sources: ResearchSource[]}>;
}
