import type { Dossier } from '@/types/blog-research.types';

export type Provider = 'openai' | 'exa' | 'tavily' | 'linkup' | 'context-dev';
export interface Input {
  eventName: string;
  regionName: string;
}
export interface DatasetRow {
  id: string;
  input: Input;
  expected: { groundTruth: string; sources: string[] };
  metadata: { ground_truth_sha256: string; [key: string]: unknown };
}
export interface Source {
  url: string;
  title: string;
  content: string;
}
export interface Charge {
  usd: number | null;
  basis: 'reported' | 'published-rate' | 'unknown';
  units?: number;
  unit?: string;
  missing?: string;
}
export interface ToolResult {
  sources: Source[];
  charge: Charge;
  errors: string[];
}
export interface Event {
  type: 'llm' | 'search' | 'read_page';
  input: unknown;
  raw: unknown;
  output?: unknown;
  charge: Charge;
  startedAt: string;
  durationMs: number;
  error?: string;
  usage?: { inputTokens: number; cachedTokens: number; outputTokens: number };
}
export type RecordEvent = (event: Event) => Promise<void>;
export interface Adapter {
  search(query: string, signal: AbortSignal): Promise<ToolResult>;
  readPage(url: string, signal: AbortSignal): Promise<ToolResult>;
}
export interface ResearchResult {
  dossier: Dossier;
  evidence: Source[];
  sources: string[];
}
interface Quote {
  excerpt: string;
  reference: string;
  explanation: string;
}
interface Criterion {
  items: { excerpt: string; reference: string }[];
  explanation: string;
  errors: Quote[];
}
export interface Report {
  basics: Record<
    'name' | 'season' | 'municipalities' | 'provinces' | 'zone',
    Quote & { status: 'correct' | 'missing' | 'incorrect' }
  >;
  criteria: Record<'races' | 'route' | 'history' | 'elite', Criterion>;
}
export interface Job {
  id: string;
  provider: Provider;
  rowId: string;
  trial: number;
}
export interface Checkpoint {
  job: Job;
  fingerprint: string;
  stage:
    | 'prepared'
    | 'researching'
    | 'researched'
    | 'evaluating'
    | 'completed'
    | 'failed'
    | 'interrupted';
  events: Event[];
  judgeEvents: Event[];
  result?: ResearchResult;
  report?: Report;
  error?: string;
  failurePhase?: 'research' | 'evaluation';
  rootSpanId: string;
}
