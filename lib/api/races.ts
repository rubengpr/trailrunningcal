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

export interface ScrapeRacesResult {
  races: import('@/types/trail-race-agent.types').TrailRaceAgentRaceRow[];
  markdown: string;
}

/**
 * Scrapes race data from an event website via the agent API. Admin-only.
 */
export async function scrapeRaces(websiteUrl: string): Promise<ScrapeRacesResult> {
  const response = await fetch('/api/races/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ websiteUrl }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to scrape races');
  }

  return responseData.data;
}

/**
 * Accepts a scraped race by creating it in the database. Admin-only.
 */
export async function acceptScrapedRace(
  race: import('@/types/trail-race-agent.types').TrailRaceAgentRaceRow,
  websiteUrl: string,
): Promise<{ id: string }> {
  const response = await fetch('/api/races', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: race.name,
      date: race.date,
      distanceKm: race.distanceKm,
      elevationGainM: race.elevationGainM,
      priceEur: null,
      websiteUrl,
      city: race.city,
      province: race.province,
      description: race.description,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to accept race');
  }

  return responseData.data;
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
