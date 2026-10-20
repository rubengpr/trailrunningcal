// @vitest-environment jsdom
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import es from '@/locales/es/translation.json';
import ca from '@/locales/ca/translation.json';
import en from '@/locales/en/translation.json';
import fr from '@/locales/fr/translation.json';
import { useFeatureFlagVariant } from '@/hooks/use-feature-flag-variant';
import { track } from '@/lib/analytics/track';
import { EventDetailHeader } from '@/components/event/event-detail-header';
import { EventCalendarMenu } from '@/components/event/event-calendar-menu';

vi.mock('@/hooks/use-feature-flag-variant', () => ({ useFeatureFlagVariant: vi.fn() }));
vi.mock('@/components/race/confirmed-date-badge', () => ({ ConfirmedDateBadge: () => null }));
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));
beforeEach(() => { vi.mocked(useFeatureFlagVariant).mockReturnValue(undefined); });

const entry = { id: 'event-1', name: 'Trail Àneu', startDate: '2026-10-25', endDate: '2026-10-26', location: 'Àneu', url: 'https://www.trailrunningcal.com/es/e/trail' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(track).mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function renderMenu() {
  render(<NextIntlClientProvider locale="es" messages={es}><EventCalendarMenu entry={entry} eventSlug="trail" locale="es" /></NextIntlClientProvider>);
  return screen.getByRole('button', { name: es.event.calendar.label });
}

describe('event calendar menu', () => {
  it('records exposure only after assignment and deduplicates rerenders and StrictMode', () => {
    const ui = () => <StrictMode><NextIntlClientProvider locale="es" messages={es}><EventCalendarMenu entry={entry} eventSlug="trail" locale="es" /></NextIntlClientProvider></StrictMode>;
    const { rerender } = render(ui());
    expect(track).not.toHaveBeenCalled();
    vi.mocked(useFeatureFlagVariant).mockReturnValue('icon_text');
    rerender(ui());
    rerender(ui());
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('event_calendar_button_viewed', {
      event_id: 'event-1', event_slug: 'trail', locale: 'es', calendar_variant: 'icon_text',
      '$feature/event-calendar-button-label': 'icon_text',
    });
  });

  it.each(['control', 'icon_text', 'google_icon'] as const)('shows and attributes the assigned %s variant', (variant) => {
    vi.mocked(useFeatureFlagVariant).mockReturnValue(variant);
    vi.spyOn(window, 'open').mockReturnValue(null);
    const trigger = renderMenu();
    expect(vi.mocked(useFeatureFlagVariant)).toHaveBeenCalledWith('event-calendar-button-label');
    expect(trigger.textContent).toBe(variant === 'icon_text' ? es.event.calendar.label : '');
    expect(trigger.querySelector('img')?.getAttribute('src') ?? null).toBe(variant === 'google_icon' ? '/icons/google-calendar.png' : null);
    expect(track).toHaveBeenCalledWith('event_calendar_button_viewed', expect.objectContaining({ calendar_variant: variant, '$feature/event-calendar-button-label': variant }));
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Google Calendar' }));
    expect(track).toHaveBeenCalledWith('event_calendar_option_clicked', expect.objectContaining({ calendar_variant: variant }));
  });

  it('opens two options, tracks intent and restores focus after selection', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const trigger = renderMenu();
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(screen.getByText(es.event.calendar.notice)).toBeDefined();
    expect(track).toHaveBeenCalledWith('event_calendar_menu_opened', { event_id: 'event-1', event_slug: 'trail', locale: 'es', calendar_variant: 'unassigned' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Google Calendar' }));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('https://calendar.google.com/calendar/r/eventedit?'), '_blank', 'noopener,noreferrer');
    expect(track).toHaveBeenCalledWith('event_calendar_option_clicked', { event_id: 'event-1', event_slug: 'trail', locale: 'es', calendar_variant: 'unassigned', option: 'google' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('supports arrow keys, Escape and outside clicks', () => {
    const trigger = renderMenu();
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'End' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('downloads an .ics file even if analytics throws and releases the object URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn().mockReturnValue('blob:calendar');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    let download = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { download = this.download; });
    vi.mocked(track).mockImplementation(() => { throw new Error('analytics unavailable'); });
    fireEvent.click(renderMenu());
    fireEvent.click(screen.getByRole('menuitem', { name: es.event.calendar.ics }));
    expect(download).toBe('trail.ics');
    expect(createObjectURL.mock.calls[0][0].type).toBe('text/calendar;charset=utf-8');
    expect(screen.queryByRole('menu')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:calendar');
  });

  it.each([{ locale: 'es' as const, messages: es }, { locale: 'ca' as const, messages: ca }, { locale: 'en' as const, messages: en }, { locale: 'fr' as const, messages: fr }])('renders translated copy for $locale', ({ locale, messages }) => {
    render(<NextIntlClientProvider locale={locale} messages={messages}><EventCalendarMenu entry={entry} eventSlug="trail" locale={locale} /></NextIntlClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: messages.event.calendar.label }));
    expect(screen.getByText(messages.event.calendar.notice)).toBeDefined();
  });
});


describe('calendar availability in the event header', () => {
  it.each([true, false])('renders the icon only when calendar dates are available: %s', (available) => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <EventDetailHeader
          calendarDates={available ? { startDate: entry.startDate, endDate: entry.endDate } : null}
          eventId={entry.id} eventSlug="trail" eventName={entry.name} websiteUrl={null}
          locale="es" formattedDate="25 de octubre de 2026" locationLabel={entry.location}
          hasConfirmedDate={available} officialWebsiteLabel="Web oficial"
          shareMessage="Trail" shareLabel="Compartir" saveFavoriteLabel="Guardar" removeFavoriteLabel="Quitar"
        />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole('button', { name: es.event.calendar.label }) !== null).toBe(available);
  });
});
