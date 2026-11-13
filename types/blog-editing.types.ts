import type { WritingRequest, WritingResult } from '@/types/blog-writing.types';

export interface EditingBlock {
  id: string;
  section: string;
  editable: boolean;
  markdown: string;
}
export interface EditingInput {
  regionName: string;
  title: string;
  blocks: EditingBlock[];
  references: Array<{ id: string; excerpt: string; blockIds: string[] }>;
  events: Array<Pick<WritingRequest['events'][number], 'eventName' | 'dossier'>>;
}
export interface EditingResponse {
  edits: Array<{ id: string; markdown: string }>;
  references: Array<{ id: string; blockId: string; excerpt: string }>;
}
export interface EditingRequest {
  source: WritingResult;
  context: WritingRequest;
}
