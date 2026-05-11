import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function updateTierPrice(
  raceId: string,
  priceEur: number,
  useAdmin: boolean,
) {
  const dbClient = useAdmin ? createAdminClient() : await createClient();

  const { data, error } = await dbClient
    .from('race_tiers')
    .update({ price_eur: priceEur, updated_at: new Date().toISOString() })
    .eq('race_id', raceId)
    .select();

  if (error) {
    console.error('Database error:', error);
    throw new Error('Failed to update prices');
  }

  return data;
}
