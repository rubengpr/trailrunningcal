import { ValidationError } from '@/lib/errors';

export type OrganizerInput = {
  organizationName: string;
  organizationWebsite?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
};

function validateOptionalUrl(value: unknown): void {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string')
    throw new ValidationError('Invalid input', 400);
  try {
    new URL(value);
  } catch {
    throw new ValidationError('Invalid input', 400);
  }
}

export function parseOrganizerInput(
  body: Record<string, unknown>,
): OrganizerInput {
  const {
    organizationName,
    organizationWebsite,
    facebookUrl,
    instagramUrl,
    youtubeUrl,
    tiktokUrl,
  } = body;

  if (
    !organizationName ||
    typeof organizationName !== 'string' ||
    organizationName.trim().length === 0 ||
    organizationName.trim().length > 100
  ) {
    throw new ValidationError('Invalid input', 400);
  }

  validateOptionalUrl(organizationWebsite);
  validateOptionalUrl(facebookUrl);
  validateOptionalUrl(instagramUrl);
  validateOptionalUrl(youtubeUrl);
  validateOptionalUrl(tiktokUrl);

  return {
    organizationName,
    organizationWebsite: organizationWebsite as string | undefined,
    facebookUrl: facebookUrl as string | undefined,
    instagramUrl: instagramUrl as string | undefined,
    youtubeUrl: youtubeUrl as string | undefined,
    tiktokUrl: tiktokUrl as string | undefined,
  };
}
