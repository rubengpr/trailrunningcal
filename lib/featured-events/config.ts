/**
 * Slugs rendered with the featured card treatment.
 *
 * Each slug needs a matching description under the `featuredEvents` namespace in
 * every locale file. Kept as a static list while the experiment runs; move to the
 * database once organizers actually pay for a slot.
 */
const FEATURED_EVENT_SLUGS = new Set<string>([
  'burriac-atac',
  'salomon-ultra-pirineu',
  'trail-l-albiol',
  'olla-de-nuria',
]);

export function isFeaturedEvent(slug: string): boolean {
  return FEATURED_EVENT_SLUGS.has(slug);
}
