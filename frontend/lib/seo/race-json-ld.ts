import type { TrailRace } from '@/types/race.types';
import type { Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';
import { getDisplayPrice } from '@/lib/race-utils';

export function buildRaceJsonLd(race: TrailRace, raceSlug: string, locale: Locale): Record<string, unknown> {
  const eventUrl = `${BASE_URL}/${locale}/carrera/${raceSlug}`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: race.name,
    sport: 'Trail Running',
    url: eventUrl,
    location: {
      '@type': 'Place',
      name: `${race.city}, ${race.province}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: race.city,
        addressRegion: race.province,
        addressCountry: 'ES',
      },
    },
  };

  if (race.date) {
    jsonLd.startDate = race.date;
    jsonLd.eventStatus = 'https://schema.org/EventScheduled';
  }

  if (race.description) {
    jsonLd.description = race.description;
  }

  if (race.websiteUrl) {
    jsonLd.sameAs = race.websiteUrl;
  }

  const price = getDisplayPrice(race.priceEur);
  if (price !== null) {
    jsonLd.offers = {
      '@type': 'Offer',
      price,
      priceCurrency: 'EUR',
      url: eventUrl,
    };
  }

  return jsonLd;
}
