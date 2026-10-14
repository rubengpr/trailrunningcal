export type ResearchStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed';
export type ResearchResultStatus = Exclude<ResearchStatus, 'partial'>;
export type DraftResearchStatus = ResearchStatus | 'not_started';

export interface ResearchSource { title: string; url: string }
export interface Dossier {
  eventName: string;
  context: string;
  sources: ResearchSource[];
  observations: string[];
}
export interface ResearchInput { regionName: string; eventName: string }
export interface ResearchMetadata {
  consultedSources: string[];
  model: string;
  responseId: string;
  usage: unknown;
  searchCalls: number;
  durationMs: number;
}
export interface ResearchOutput extends ResearchMetadata { dossier: Dossier }
export interface ResearchResult {
  id: string;
  eventId: string;
  eventName: string;
  position: number;
  status: ResearchResultStatus;
  dossier: Dossier | null;
  consultedSources: string[];
  errorCode: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}
export interface ResearchRun {
  id: string;
  draftId: string;
  input: { regionName: string; events: {id: string; name: string}[] };
  provider: string;
  model: string;
  status: ResearchStatus;
  createdAt: string;
  finishedAt: string | null;
  errorCode: string | null;
  results: ResearchResult[];
}
export interface ResearchPage {
  runs: ResearchRun[];
  pagination: {page: number; pageSize: number; total: number; totalPages: number};
}
