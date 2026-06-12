import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';

const FALLBACK_EMPTY_MESSAGE =
  'No se encontró un evento de trail válido en el contenido proporcionado.';

const PAST_RACES_MESSAGE =
  'Las carreras encontradas tienen fechas pasadas y no se pueden importar.';

export function filterFutureRaces(
  result: OpenRouterServiceResult,
): OpenRouterServiceResult {
  const todayStr = new Date().toISOString().split('T')[0];
  const races = result.races.filter(
    (race) => race.date === null || race.date >= todayStr,
  );
  let errorMessage: string | null = null;
  if (races.length === 0) {
    errorMessage =
      result.races.length > 0
        ? PAST_RACES_MESSAGE
        : (result.errorMessage ?? FALLBACK_EMPTY_MESSAGE);
  }
  return {
    ...result,
    races,
    errorMessage,
    rawModelOutput: JSON.stringify({
      event: result.event,
      races,
      errorMessage,
    }),
  };
}
