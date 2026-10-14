import { selectRelevantEventRaces } from '@/lib/events/utils';
import { createAdminClient } from '@/lib/supabase/server';
import { provinces } from '@/lib/blog/regions';
import { parseDocument, DomUtils } from 'htmlparser2';
import type { BlogRegionId, EventSelectionPage, SelectedEvent } from '@/types/blog-selection.types';

interface Row {
  id: string; name: string; slug: string; description: string | null;
  races: Array<{ id: string; name: string | null; city: string; province: string; date?: string | null; distance_km: number; elevation_gain_m: number | null }>;
}
const fields = 'id,name,slug,description,races!inner(id,name,city,province,date,distance_km,elevation_gain_m)';
function eventQuery(regionId: BlogRegionId, search: string, head = false) {
  let query = createAdminClient().from('events').select(fields, {count: 'exact', ...(head ? {head: true} : {})}).in('races.province', provinces(regionId));
  if (search) query = query.ilike('name', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
  return query;
}
function map(row: Row): SelectedEvent {
  return { id: row.id, name: row.name, slug: row.slug,
    description: row.description ? DomUtils.textContent(parseDocument(row.description)).replace(/\s+/g, ' ').trim() || null : null,
    races: selectRelevantEventRaces(row.races.map(race => ({id: race.id, name: race.name, city: race.city, province: race.province, distanceKm: race.distance_km, elevationGainM: race.elevation_gain_m, date: race.date ?? null, resultsUrl: null, tiers: []})))
      .map(({id, name, city, province, distanceKm, elevationGainM}) => ({id, name, city, province, distanceKm, elevationGainM})),
  };
}
export async function listEvents(regionId: BlogRegionId, search: string, page: number): Promise<EventSelectionPage> {
  const pageSize = 50;
  const query = eventQuery(regionId, search);
  const {data, count, error} = await query.order('name').order('id').range((page - 1) * pageSize, page * pageSize - 1);
  if (error?.code === 'PGRST103') {
    const totalResult = await eventQuery(regionId, search, true);
    if (totalResult.error) throw totalResult.error;
    const total = totalResult.count ?? 0;
    return {events: [], pagination: {page, pageSize, total, totalPages: Math.ceil(total / pageSize)}};
  }
  if (error) throw error;
  const total = count ?? 0;
  return {events: (data as unknown as Row[] ?? []).map(map), pagination: {page, pageSize, total, totalPages: Math.ceil(total / pageSize)}};
}
export async function selectedEvents(regionId: BlogRegionId, ids: string[]): Promise<SelectedEvent[]> {
  const {data, error} = await createAdminClient().from('events').select(fields).in('id', ids).in('races.province', provinces(regionId));
  if (error) throw error;
  return (data as unknown as Row[] ?? []).map(map);
}
