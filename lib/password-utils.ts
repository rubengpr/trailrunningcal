/**
 * Validates password strength against security requirements
 * @param password - The password to validate
 * @returns true if password meets all requirements, false otherwise
 */
export function validatePasswordStrength(password: string): boolean {
  if (!password || password.length < 8) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}
