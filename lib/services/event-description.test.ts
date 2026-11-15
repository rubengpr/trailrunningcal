import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateEventDescriptionDraft, sanitizeEventDescription } from '@/lib/services/event-description';

const mocks = vi.hoisted(() => ({
  getEvent: vi.fn(),
  crawlSite: vi.fn(),
}));

vi.mock('@/lib/db/events', () => ({
  getEventByIdForAdmin: mocks.getEvent,
  updateEventDescriptionForAdmin: vi.fn(),
}));
vi.mock('@/lib/services/crawl', () => ({ crawlSite: mocks.crawlSite }));

beforeEach(() => vi.resetAllMocks());

describe('sanitizeEventDescription', () => {
  it('allows clearing an event description', () => {
    expect(sanitizeEventDescription(null)).toEqual({
      value: null,
      error: null,
    });
    expect(sanitizeEventDescription('   ')).toEqual({
      value: null,
      error: null,
    });
  });

  it('rejects non-string descriptions', () => {
    expect(sanitizeEventDescription(123).error).toBe('Invalid description');
  });

  it('rejects short descriptions', () => {
    expect(sanitizeEventDescription('Demasiado corta').error).toBe(
      'Description is too short',
    );
  });

  it('trims valid descriptions', () => {
    const description =
      '  La prueba recorre senderos de montaña con una propuesta variada para corredores populares y experimentados. El entorno combina pistas, caminos y tramos técnicos según la distancia elegida.\n\nEl evento reúne varias modalidades adultas y mantiene un ambiente cercano en torno al municipio organizador, con una oferta pensada para distintos niveles de experiencia en trail running.  ';

    expect(sanitizeEventDescription(description)).toEqual({
      value: description.trim(),
      error: null,
    });
  });
});

describe('generateEventDescriptionDraft', () => {
  it('returns a 404 domain error before contacting providers for a missing event', async () => {
    mocks.getEvent.mockResolvedValue(null);

    await expect(generateEventDescriptionDraft('missing-event')).rejects.toMatchObject({
      message: 'Event not found', status: 404,
    });
    expect(mocks.crawlSite).not.toHaveBeenCalled();
  });

  it.each([null, '', '   '])('returns a 422 domain error for an event without a usable website (%s)', async (websiteUrl) => {
    mocks.getEvent.mockResolvedValue({ event: { id: 'event-1', websiteUrl }, races: [] });

    await expect(generateEventDescriptionDraft('event-1')).rejects.toMatchObject({
      message: 'Event website URL is required', status: 422,
    });
    expect(mocks.crawlSite).not.toHaveBeenCalled();
  });
});
