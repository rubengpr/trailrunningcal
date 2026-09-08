import { ValidationError } from '@/lib/errors';

export { ValidationError };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertRequestBody(
  body: unknown,
): asserts body is Record<string, unknown> {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError('Invalid request body', 400);
  }
}

export function parseUuidParam(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError(`Invalid ${label}`, 400);
  }

  return value;
}
