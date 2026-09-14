import { describe, expect, it } from 'vitest';

import {
  buildEventDescriptionsHref,
  parseEventDescriptionPage,
} from '@/lib/event-description/pagination';

describe('event description pagination', () => {
  it('normalizes invalid page values', () => {
    expect(parseEventDescriptionPage({})).toBe(1);
    expect(parseEventDescriptionPage({ page: '-1' })).toBe(1);
    expect(parseEventDescriptionPage({ page: '1.5' })).toBe(1);
    expect(parseEventDescriptionPage({ page: ['3', '4'] })).toBe(3);
  });

  it('builds canonical page URLs', () => {
    expect(buildEventDescriptionsHref('en', 1)).toBe(
      '/en/admin/eventos/descripciones',
    );
    expect(buildEventDescriptionsHref('en', 2)).toBe(
      '/en/admin/eventos/descripciones?page=2',
    );
  });
});
