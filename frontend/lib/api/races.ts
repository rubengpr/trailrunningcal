/**
 * Updates a race via the API. Safe to call from client components.
 */
export async function updateRace(
  raceId: string,
  date: string,
  name: string,
  distanceKm: string,
  elevationGainM: string,
  websiteUrl: string,
) {
  const response = await fetch('/api/races', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      raceId,
      date,
      name,
      distanceKm: Number(distanceKm),
      elevationGainM: Number(elevationGainM),
      websiteUrl,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to update race');
  }

  return responseData;
}
