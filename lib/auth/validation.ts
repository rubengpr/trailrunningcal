import { validatePasswordStrength } from '@/lib/utils/password';

export type AuthErrorKey =
  | 'emailRequired'
  | 'emailTooLong'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordStrength';

export function validateEmail(
  email: string,
  t: (key: AuthErrorKey) => string
): string | null {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return t('emailRequired');
  }

  // RFC 5321: max 254 characters
  if (trimmedEmail.length > 254) {
    return t('emailTooLong');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmedEmail)) {
    return t('emailInvalid');
  }

  const [localPart, domainPart] = trimmedEmail.split('@');

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return t('emailInvalid');
  }

  if (
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    domainPart.startsWith('-') ||
    domainPart.endsWith('-')
  ) {
    return t('emailInvalid');
  }

  if (domainPart.includes('..')) {
    return t('emailInvalid');
  }

  // Hyphens adjacent to dots are invalid label boundaries
  if (domainPart.includes('.-') || domainPart.includes('-.')) {
    return t('emailInvalid');
  }

  return null;
}

export interface PasswordValidationOptions {
  requireStrength?: boolean;
}

export function validatePassword(
  password: string,
  t: (key: AuthErrorKey) => string,
  options: PasswordValidationOptions = {}
): string | null {
  const { requireStrength = true } = options;

  if (!password.trim()) {
    return t('passwordRequired');
  }

  if (requireStrength && !validatePasswordStrength(password)) {
    return t('passwordStrength');
  }

  return null;
}
