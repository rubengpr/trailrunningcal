import { ValidationError } from '@/lib/errors';

export { ValidationError };

export function assertRequestBody(
  body: unknown,
): asserts body is Record<string, unknown> {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }
}
