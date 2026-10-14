import { listEvents, selectedEvents } from '@/lib/db/blog-events';
import { isRegion } from '@/lib/blog/regions';
import { ValidationError } from '@/lib/errors';
import es from '@/locales/es/translation.json';
import type { SelectionContext, SelectionInput } from '@/types/blog-selection.types';

function region(id: string) {
  if (!isRegion(id)) throw new ValidationError('invalid_selection', 422);
  return id;
}
export function list(regionId: string, search: string, page: number) {
  return listEvents(region(regionId), search.trim(), page);
}
export async function snapshot(input: SelectionInput): Promise<SelectionContext> {
  const regionId = region(input.regionId);
  if (input.eventIds.length !== 5 || new Set(input.eventIds).size !== 5) throw new ValidationError('invalid_selection', 422);
  const events = await selectedEvents(regionId, input.eventIds);
  if (events.length !== 5 || events.some(event => !event.name.trim() || !event.slug || !event.races.length)) throw new ValidationError('invalid_selection', 422);
  const ordered = input.eventIds.map(id => events.find(event => event.id === id));
  if (ordered.some(event => !event)) throw new ValidationError('invalid_selection', 422);
  return {format: 'regional-selection', regionId, regionName: es.geography.regions[regionId], events: ordered as SelectionContext['events']};
}
export function instructions(context: SelectionContext): string {
  return `Escribe una selección editorial de cinco eventos de trail running en ${context.regionName}, sin año. Distingue eventos y modalidades. Incluye introducción, selección editorial, comparativa, una sección por evento y orientación final. Respeta este orden: ${context.events.map(event => event.name).join('; ')}. Usa únicamente los datos suministrados. No inventes reputación, experiencia, terreno, fechas, precios ni inscripciones.`;
}
