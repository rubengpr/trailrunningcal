import {
  researchEvent,
  sanitizeResearchFailure,
} from '@/lib/integrations/openai/event-research';

import { MODEL } from './config';
import type { FailureKind, ResearchProvider } from './types';

export function sanitizeFailure(error: unknown): FailureKind {
  return sanitizeResearchFailure(error);
}

export async function createOpenAIProvider(
  model = MODEL,
): Promise<ResearchProvider> {
  return {
    async research(input) {
      const run = await researchEvent({
        eventName: input.eventName,
        model,
        traceMetadata: { workflow: 'event-research-eval' },
      });

      return {
        result: run.result,
        failure: run.failure,
        response: run.response
          ? {
              id: run.response.id,
              model: run.response.model,
              status: run.response.status,
              searchCallCount: run.response.searchCallCount,
              sources: run.response.sources,
            }
          : null,
      };
    },
  };
}
