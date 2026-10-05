import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';

export async function updateTierPrice(
  raceId: string,
  tierId: string,
  priceEur: number | null,
  useAdmin: boolean,
) {
  const dbClient = useAdmin ? createAdminClient() : await createClient();

  const { data, error } = await dbClient
    .from('race_tiers')
    .update({ price_eur: priceEur, updated_at: new Date().toISOString() })
    .eq('race_id', raceId)
    .eq('id', tierId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Database error:', error);
    throw new Error('Failed to update prices');
  }

  if (!data) {
    throw new ValidationError('Tier not found', 404);
  }

  return data;
}
