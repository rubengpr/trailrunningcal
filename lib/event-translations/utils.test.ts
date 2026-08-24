import { describe, expect, it } from 'vitest';
import { selectUntranslatedEventCandidates } from '@/lib/event-translations/utils';

const description = 'Primer párrafo de la descripción.\n\nSegundo párrafo de la descripción.';

describe('selectUntranslatedEventCandidates', () => {
  it('advances to untranslated eligible events and ignores complete ones', () => {
    const candidates = selectUntranslatedEventCandidates({
      events: [
        { id: 'new', slug: 'new-event', name: 'New', description },
        { id: 'complete', slug: 'complete-event', name: 'Complete', description },
        { id: 'invalid', slug: 'invalid-event', name: 'Invalid', description: 'Only one paragraph.' },
      ],
      translations: [
        { event_id: 'complete', locale: 'ca' },
        { event_id: 'complete', locale: 'en' },
        { event_id: 'complete', locale: 'fr' },
      ],
      locales: ['ca', 'en', 'fr'],
      limit: 20,
    });

    expect(candidates).toEqual([{ id: 'new', slug: 'new-event', name: 'New', description }]);
  });

  it('does not select a partial event for a multi-locale batch but can finish its missing locale safely', () => {
    const events = [{ id: 'partial', slug: 'partial-event', name: 'Partial', description }];
    const translations = [{ event_id: 'partial', locale: 'ca' as const }];

    expect(selectUntranslatedEventCandidates({
      events,
      translations,
      locales: ['ca', 'en', 'fr'],
      limit: 20,
    })).toEqual([]);
    expect(selectUntranslatedEventCandidates({
      events,
      translations: [],
      locales: ['en'],
      limit: 20,
    })).toHaveLength(1);
  });
});
