import { ValidationError } from '@/lib/errors';

export type ProfileInput = {
  userName: string;
  userRole?: string | null;
};

export function parseProfileInput(body: Record<string, unknown>): ProfileInput {
  const { userName, userRole } = body;

  if (
    !userName ||
    typeof userName !== 'string' ||
    userName.trim().length === 0 ||
    userName.trim().length > 100
  ) {
    throw new ValidationError('Invalid input', 400);
  }

  if (
    userRole !== undefined &&
    userRole !== null &&
    (typeof userRole !== 'string' || userRole.length > 100)
  ) {
    throw new ValidationError('Invalid input', 400);
  }

  return { userName, userRole: userRole as string | null | undefined };
}
