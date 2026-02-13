export async function updatePrice(data: { raceId: string; priceEur: number }) {
  const response = await fetch('/api/race_tiers', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to update race price');
  }

  return responseData;
}
