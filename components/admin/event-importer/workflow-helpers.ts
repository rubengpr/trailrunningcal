import { normalizeUrl } from '@/lib/validation';
import type { EventImportStep } from '@/types/events-import-api.types';

export const RESEARCH_ERROR_TRANSLATION_KEYS: Record<string, string> = {
    api_error: 'research.errors.apiError',
    incomplete_response: 'research.errors.incompleteResponse',
    parse_error: 'research.errors.parseError',
    processing_error: 'research.errors.processingError',
    refusal: 'research.errors.refusal',
    scheduling_error: 'research.errors.schedulingError',
    timeout: 'research.errors.timeout',
};

export function isValidUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;
    try {
        new URL(normalizeUrl(trimmed));
        return true;
    } catch {
        return false;
    }
}

export function findStep(
    steps: EventImportStep[],
    name: EventImportStep['name'],
    occurrence = 0,
): EventImportStep | null {
    let seen = 0;
    for (const step of steps) {
        if (step.name !== name) continue;
        if (seen === occurrence) return step;
        seen += 1;
    }
    return null;
}
