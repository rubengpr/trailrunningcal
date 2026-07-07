import { createOpenRouterClient } from '@/lib/integrations/openrouter/client';
import { runEventDescriptionAgent } from '@/lib/integrations/openrouter/event-description';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { crawlSite } from '@/lib/services/crawl';
import { getEventByIdForAdmin } from '@/lib/db/events';
import type { EventDescriptionDraftResult } from '@/types/event-description.types';
import type { TrailEventDetail } from '@/types/event.types';

export const DEFAULT_EVENT_DESCRIPTION_MODEL: OpenRouterScrapeModelId =
  'openai/gpt-5.4-mini';

export function sanitizeEventDescription(description: unknown): {
  value: string | null;
  error: string | null;
} {
  if (description === null || description === undefined) {
    return { value: null, error: null };
  }

  if (typeof description !== 'string') {
    return { value: null, error: 'Invalid description' };
  }

  const trimmed = description.trim();
  if (trimmed.length === 0) {
    return { value: null, error: null };
  }

  if (trimmed.length < 100) {
    return { value: null, error: 'Description is too short' };
  }

  if (trimmed.length > 1000) {
    return { value: null, error: 'Description is too long' };
  }

  return { value: trimmed, error: null };
}

function buildAgentInput(
  eventDetail: TrailEventDetail,
  markdown: string,
): string {
  return [
    '# Primary event to describe',
    `Event name: ${eventDetail.event.name}`,
    '',
    '# Scraped markdown',
    markdown,
  ].join('\n');
}

export async function generateEventDescriptionDraft(
  eventId: string,
  model: OpenRouterScrapeModelId = DEFAULT_EVENT_DESCRIPTION_MODEL,
): Promise<EventDescriptionDraftResult> {
  const eventDetail = await getEventByIdForAdmin(eventId);

  if (!eventDetail) {
    throw new Error('Event not found');
  }

  const websiteUrl = eventDetail.event.websiteUrl?.trim();
  if (!websiteUrl) {
    throw new Error('Event website URL is required');
  }

  const scrape = await crawlSite(websiteUrl);
  const client = createOpenRouterClient();
  const agentResult = await runEventDescriptionAgent(
    client,
    buildAgentInput(eventDetail, scrape.markdown),
    model,
  );

  const descriptionResult = sanitizeEventDescription(agentResult.description);
  const description = descriptionResult.value;

  if (!description) {
    return {
      eventId: eventDetail.event.id,
      eventName: eventDetail.event.name,
      eventSlug: eventDetail.event.slug,
      websiteUrl,
      description: '',
      errorMessage:
        descriptionResult.error ??
        agentResult.errorMessage ??
        'No se pudo generar una descripción útil.',
      markdown: scrape.markdown,
      rawModelOutput: agentResult.rawModelOutput,
      usage: agentResult.usage,
      pageStats: scrape.pageStats,
    };
  }

  return {
    eventId: eventDetail.event.id,
    eventName: eventDetail.event.name,
    eventSlug: eventDetail.event.slug,
    websiteUrl,
    description,
    errorMessage: null,
    markdown: scrape.markdown,
    rawModelOutput: agentResult.rawModelOutput,
    usage: agentResult.usage,
    pageStats: scrape.pageStats,
  };
}
