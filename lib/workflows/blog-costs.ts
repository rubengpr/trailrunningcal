import { recordCall } from '@/lib/services/blog-costs';
import type { CostEntry } from '@/types/blog-cost.types';

export async function recordCostStep(entry: CostEntry): Promise<void> {
  'use step';
  await recordCall(entry);
}

// Cost tracking never changes the outcome of research, writing or evaluation.
export async function trackCost(entry: CostEntry): Promise<void> {
  try { await recordCostStep(entry); } catch {
    console.error('Blog cost tracking failed', {key: entry.key, stage: entry.stage});
  }
}
