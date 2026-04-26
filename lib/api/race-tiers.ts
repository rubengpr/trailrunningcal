export async function updatePrice(data: { raceId: string; priceEur: number }) {
  const response = await fetch(`/api/races/${data.raceId}/tiers`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceEur: data.priceEur }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to update race price');
  }

  return responseData;
}
