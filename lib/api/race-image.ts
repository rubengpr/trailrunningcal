export interface RaceImageStatus {
  hasImage: boolean;
  filename?: string;
  imageUrl?: string;
}

export async function checkRaceImage(raceId: string): Promise<RaceImageStatus> {
  const response = await fetch(`/api/races/${raceId}/image`, {
    method: 'GET',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error ?? 'Failed to check image');
  }

  return json.data;
}

export async function uploadRaceImage(raceId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`/api/races/${raceId}/image`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to update race');
  }
}

export async function removeRaceImage(raceId: string): Promise<void> {
  const response = await fetch(`/api/races/${raceId}/image`, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to update race');
  }
}
