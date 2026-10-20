import { describe, expect, it } from 'vitest';
import { buildCalendarFile, buildCalendarLink, getCalendarDates } from '@/lib/events/calendar';
import type { CalendarEntry } from '@/types/event-calendar.types';

const entry: CalendarEntry = {
  id: 'event-1', name: 'Trail, muntanya; Àneu \\ 2026',
  startDate: '2026-10-24', endDate: '2026-10-27',
  location: 'Àneu, Lleida', description: 'Consulta los detalles.\nSegunda línea.',
  url: 'https://www.trailrunningcal.com/es/e/trail-aneu',
};

describe('calendar dates', () => {
  it.each([
    ['2026-10-25', null, '2026-10-26'],
    ['2026-10-24', '2026-10-26', '2026-10-27'],
    ['2026-12-31', '2026-12-31', '2027-01-01'],
    ['2028-02-28', '2028-02-29', '2028-03-01'],
    ['2026-03-29', null, '2026-03-30'],
  ])('exports %s through %s with exclusive end %s', (startDate, endDate, expected) => {
    expect(getCalendarDates({ startDate, endDate })).toEqual({ startDate, endDate: expected });
  });

  it.each([
    [null, null], ['2026-02-30', null], ['invalid', null],
    ['2026-10-20', 'invalid'], ['2026-10-20', '2026-10-19'],
  ])('rejects invalid or unknown ranges %s / %s', (startDate, endDate) => {
    expect(getCalendarDates({ startDate, endDate })).toBeNull();
  });
});

describe('calendar exports', () => {
  it('uses the same all-day dates and content for Google and iCalendar', () => {
    const url = new URL(buildCalendarLink(entry));
    expect(url.searchParams.get('dates')).toBe('20261024/20261027');
    expect(url.searchParams.get('text')).toBe(entry.name);
    expect(url.searchParams.get('location')).toBe(entry.location);
    expect(url.searchParams.get('details')).toBe(`${entry.description}\n${entry.url}`);
    const file = buildCalendarFile(entry, new Date('2026-10-20T12:30:00Z'));
    expect(file).toContain('DTSTART;VALUE=DATE:20261024\r\nDTEND;VALUE=DATE:20261027');
    expect(file).toContain('DTSTAMP:20261020T123000Z');
    expect(file).toContain('UID:event-1-2026@trailrunningcal.com');
    expect(file).toContain('SUMMARY:Trail\\, muntanya\\; Àneu \\\\ 2026');
    expect(file).toContain('DESCRIPTION:Consulta los detalles.\\nSegunda línea.\\n');
    expect(file).toContain(`URL:${entry.url}`);
    expect(file.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('folds long UTF-8 text within 75 bytes without losing characters', () => {
    const name = 'À🏃'.repeat(70);
    const file = buildCalendarFile({ ...entry, name });
    for (const line of file.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(file.replace(/\r\n /g, '')).toContain(`SUMMARY:${name}\r\n`);
  });

  it('escapes newlines so content cannot inject calendar properties', () => {
    expect(buildCalendarFile({ ...entry, name: 'Trail\r\nATTENDEE:someone' })).toContain('SUMMARY:Trail\\nATTENDEE:someone\r\n');
  });
});
