import { validatePasswordStrength } from '@/lib/password-utils';

/**
 * Translation keys used for auth validation error messages
 */
export type AuthErrorKey =
  | 'emailRequired'
  | 'emailTooLong'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordStrength';

/**
 * Validates an email address according to RFC 5321 standards and best practices
 *
 * @param email - The email address to validate
 * @param t - Translation function that takes an error key and returns the localized message
 * @returns Error message string if invalid, null if valid
 *
 * @example
 * ```typescript
 * const t = (key: string) => authT(`errors.${key}`);
 * const error = validateEmail(email, t);
 * if (error) {
 *   setEmailError(error);
 *   return false;
 * }
 * ```
 */
export function validateEmail(
  email: string,
  t: (key: AuthErrorKey) => string
): string | null {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return t('emailRequired');
  }

  // Check maximum length (RFC 5321: 254 characters)
  if (trimmedEmail.length > 254) {
    return t('emailTooLong');
  }

  // Basic email format check (TLD must be at least 2 characters)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmedEmail)) {
    return t('emailInvalid');
  }

  // Split email into local and domain parts
  const [localPart, domainPart] = trimmedEmail.split('@');

  // Local part validations
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return t('emailInvalid');
  }

  // Domain part validations
  // 1. Edge cases (no leading/trailing dots or hyphens)
  if (
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    domainPart.startsWith('-') ||
    domainPart.endsWith('-')
  ) {
    return t('emailInvalid');
  }

  // 2. Consecutive dots
  if (domainPart.includes('..')) {
    return t('emailInvalid');
  }

  // 3. Hyphens adjacent to dots (invalid label boundaries)
  if (domainPart.includes('.-') || domainPart.includes('-.')) {
    return t('emailInvalid');
  }

  return null;
}

/**
 * Options for password validation
 */
export interface PasswordValidationOptions {
  /**
   * Whether to enforce password strength requirements
   * - true (default): Requires 8+ chars, uppercase, lowercase, number, special char
   * - false: Only checks if password is non-empty (used for login forms)
   */
  requireStrength?: boolean;
}

/**
 * Validates a password with optional strength requirements
 *
 * @param password - The password to validate
 * @param t - Translation function that takes an error key and returns the localized message
 * @param options - Validation options (default: { requireStrength: true })
 * @returns Error message string if invalid, null if valid
 *
 * @example
 * ```typescript
 * // For sign-up/update forms (requires strong password)
 * const t = (key: string) => authT(`errors.${key}`);
 * const error = validatePassword(password, t);
 *
 * // For login form (only checks if non-empty)
 * const error = validatePassword(password, t, { requireStrength: false });
 * ```
 */
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
