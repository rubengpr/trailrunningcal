'use client';

import { getMallorcaNaakCourse } from '@/lib/sponsors/naak-mallorca-profiles';
import { NaakNutritionCard, type NaakRaceOption } from './naak-nutrition-card';

const PREVIEW_RACE: NaakRaceOption = {
  id: '138',
  name: 'Serra de Tramuntana',
  distanceKm: 138,
  elevationGainM: 5350,
  course: getMallorcaNaakCourse(138),
};

/** Temporary local-only mount for rapid result visual QA. */
export function NaakNutritionResultPreview() {
  return (
    <NaakNutritionCard
      eventName="Mallorca by UTMB®"
      races={[PREVIEW_RACE]}
      initialResult={{ raceId: PREVIEW_RACE.id, expectedHours: '10', expectedMinutes: '50' }}
    />
  );
}
