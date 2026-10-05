import { revalidateEventPages, revalidateHomepages } from '@/lib/cache/revalidation';
import { getEventSlugForRace } from '@/lib/db/races';
import { updateTierPrice } from '@/lib/db/race-tiers';

export async function updateRaceTier(
  raceId: string,
  tierId: string,
  priceEur: number | null,
  isAdmin: boolean,
) {
  const data = await updateTierPrice(raceId, tierId, priceEur, isAdmin);

  revalidateHomepages('race-tier-update');
  const eventSlug = await getEventSlugForRace(raceId, isAdmin);
  if (eventSlug) {
    revalidateEventPages(eventSlug, 'race-tier-update');
  }

  return data;
}
