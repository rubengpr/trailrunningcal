import { ValidationError } from '@/lib/errors';

export { ValidationError };

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
