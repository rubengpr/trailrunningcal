import { describe, expect, it } from 'vitest';

import { TRAIL_EVENT_AGENT_JSON_SCHEMA } from '@/lib/agents/trail-event-agent-schema';
import { normalizeRaceName } from '@/lib/races/utils';

describe('normalizeRaceName', () => {
  it.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['   ', null],
    ['/', null],
    [',', null],
    ['-', null],
    ['---', null],
    ['|', null],
    [' / , - | ', null],
  ])('returns null for missing or symbol-only names', (input, expected) => {
    expect(normalizeRaceName(input)).toBe(expected);
  });

  it.each([
    [' Trail ', 'Trail'],
    ['Trail & Run 2026', 'Trail & Run 2026'],
    ['10K', '10K'],
  ])('keeps names with letters or numbers', (input, expected) => {
    expect(normalizeRaceName(input)).toBe(expected);
  });
});

describe('TRAIL_EVENT_AGENT_JSON_SCHEMA', () => {
  it('allows null race names in structured output', () => {
    const races = TRAIL_EVENT_AGENT_JSON_SCHEMA.properties.races;
    const name = races.items.properties.name;

    expect(name).toEqual({
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });
  });
});
