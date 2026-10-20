import type { TrailEventDateRange } from '@/types/event.types';
import type { CalendarEntry } from '@/types/event-calendar.types';

function parseDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

/** Returns date-only boundaries; the end is exclusive in both calendar formats. */
export function getCalendarDates(range: TrailEventDateRange): Pick<CalendarEntry, 'startDate' | 'endDate'> | null {
  const start = parseDate(range.startDate);
  if (!start) return null;
  const end = range.endDate === null ? new Date(start) : parseDate(range.endDate);
  if (!end || end < start) return null;
  end.setUTCDate(end.getUTCDate() + 1);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export function buildCalendarLink(entry: CalendarEntry): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: entry.name,
    dates: `${entry.startDate.replaceAll('-', '')}/${entry.endDate.replaceAll('-', '')}`,
    location: entry.location,
    details: `${entry.description}\n${entry.url}`,
  });
  return `https://calendar.google.com/calendar/r/eventedit?${params}`;
}

function escapeText(value: string): string {
  return value.replaceAll('\\', '\\\\').replace(/\r\n|\r|\n/g, '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
}

function foldLine(value: string): string {
  const encoder = new TextEncoder();
  let line = '';
  let length = 0;
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (length + size > 75) {
      line += '\r\n ';
      length = 1;
    }
    line += character;
    length += size;
  }
  return line;
}

export function buildCalendarFile(entry: CalendarEntry, generatedAt = new Date()): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trailrunningcal//Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${escapeText(`${entry.id}-${entry.startDate.slice(0, 4)}@trailrunningcal.com`)}`,
    `DTSTAMP:${generatedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;VALUE=DATE:${entry.startDate.replaceAll('-', '')}`,
    `DTEND;VALUE=DATE:${entry.endDate.replaceAll('-', '')}`,
    `SUMMARY:${escapeText(entry.name)}`,
    `LOCATION:${escapeText(entry.location)}`,
    `DESCRIPTION:${escapeText(`${entry.description}\n${entry.url}`)}`,
    `URL:${entry.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n';
}
