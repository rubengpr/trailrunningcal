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
  city: string,
  province: string,
  description: string,
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
      city,
      province,
      description,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to update race');
  }

  return responseData;
}

/**
 * Deletes a race via the API. Safe to call from client components.
 */
export async function deleteRace(raceId: string): Promise<void> {
  const response = await fetch(`/api/races/${raceId}`, {
    method: 'DELETE',
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to delete race');
  }
}

/**
 * Creates a new race via the API. Safe to call from client components.
 */
export async function createRace(fields: {
  date: string;
  name: string;
  distanceKm: string;
  elevationGainM: string;
  priceEur: string;
  websiteUrl: string;
  city: string;
  province: string;
  description: string;
}): Promise<{ id: string }> {
  const response = await fetch('/api/races', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: fields.date,
      name: fields.name,
      distanceKm: Number(fields.distanceKm),
      elevationGainM: Number(fields.elevationGainM),
      priceEur: parseInt(fields.priceEur, 10),
      websiteUrl: fields.websiteUrl,
      city: fields.city,
      province: fields.province,
      description: fields.description,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to create race');
  }

  return responseData.data;
}
