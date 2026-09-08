import { revalidateEventPages, revalidateHomepages } from '@/lib/cache/revalidation';
import { getEventSlugForRace } from '@/lib/db/races';
import { updateTierPrice } from '@/lib/db/race-tiers';

export async function updateRaceTier(
  raceId: string,
  priceEur: number | null,
  isAdmin: boolean,
) {
  const data = await updateTierPrice(raceId, priceEur, isAdmin);

  revalidateHomepages();
  const eventSlug = await getEventSlugForRace(raceId, isAdmin);
  if (eventSlug) {
    revalidateEventPages(eventSlug);
  }

  return data;
}
