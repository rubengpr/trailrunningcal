import { ValidationError } from '@/lib/errors';
export { ValidationError };

export type ParsedRaceInput = {
  name: string | null;
  date: string;
  distanceKm: number;
  elevationGainM: number | null;
  priceEur: number | null;
  websiteUrl: string;
  city: string;
  province: string;
  description: string | null;
};

export function sanitizeDescription(description: unknown): { value: string | null; error: string | null } {
  if (description === undefined || description === null) {
    return { value: null, error: null };
  }
  if (typeof description !== 'string') {
    return { value: null, error: 'Invalid input' };
  }
  const trimmed = description.trim();
  if (trimmed.length > 0 && (trimmed.length < 10 || trimmed.length > 2000)) {
    return { value: null, error: 'Invalid input' };
  }
  return { value: trimmed.length > 0 ? trimmed : null, error: null };
}

export function parseRaceInput(body: unknown, isAdmin: boolean): ParsedRaceInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const {
    name,
    date,
    distanceKm,
    elevationGainM,
    priceEur,
    websiteUrl,
    city,
    province,
    description,
  } = body as Record<string, unknown>;

  if (name !== null && name !== undefined && typeof name !== 'string') {
    throw new ValidationError('Invalid race name', 400);
  }

  if (!date || typeof date !== 'string') {
    throw new ValidationError('Invalid date', 400);
  }

  if (
    typeof distanceKm !== 'number' ||
    distanceKm <= 0 ||
    distanceKm >= 1000
  ) {
    throw new ValidationError('Invalid distance', 400);
  }

  if (elevationGainM === null && !isAdmin) {
    throw new ValidationError('Invalid elevation gain', 400);
  }
  if (
    elevationGainM !== null &&
    (typeof elevationGainM !== 'number' ||
      !Number.isInteger(elevationGainM) ||
      elevationGainM <= 0 ||
      elevationGainM >= 100000)
  ) {
    throw new ValidationError('Invalid elevation gain', 400);
  }

  if (
    priceEur !== null &&
    (typeof priceEur !== 'number' ||
      !Number.isInteger(priceEur) ||
      priceEur < 0 ||
      priceEur >= 1000)
  ) {
    throw new ValidationError('Invalid price', 400);
  }

  if (!websiteUrl || typeof websiteUrl !== 'string') {
    throw new ValidationError('Invalid website URL', 400);
  }
  try {
    new URL(websiteUrl as string);
  } catch {
    throw new ValidationError('Invalid website URL format', 400);
  }

  if (
    !city ||
    typeof city !== 'string' ||
    (city as string).trim().length === 0 ||
    (city as string).trim().length > 100
  ) {
    throw new ValidationError('Invalid city', 400);
  }

  if (
    !province ||
    typeof province !== 'string' ||
    (province as string).trim().length === 0 ||
    (province as string).trim().length > 100
  ) {
    throw new ValidationError('Invalid province', 400);
  }

  const descResult = sanitizeDescription(description);
  if (descResult.error) {
    throw new ValidationError(descResult.error, 400);
  }

  return {
    name:
      typeof name === 'string' && name.trim().length > 0 ? name.trim() : null,
    date: date as string,
    distanceKm: distanceKm as number,
    elevationGainM: elevationGainM as number | null,
    priceEur: priceEur as number | null,
    websiteUrl: websiteUrl as string,
    city: (city as string).trim(),
    province: (province as string).trim(),
    description: descResult.value,
  };
}
