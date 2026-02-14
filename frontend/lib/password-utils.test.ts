import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from './password-utils';

describe('validatePasswordStrength', () => {
  describe('length validation', () => {
    it('should fail for passwords shorter than 8 characters', () => {
      expect(validatePasswordStrength('Abc1!')).toBe(false); // 5 chars
      expect(validatePasswordStrength('Abc12!')).toBe(false); // 6 chars
      expect(validatePasswordStrength('Abc123!')).toBe(false); // 7 chars
    });

    it('should pass for passwords with 8 or more characters', () => {
      expect(validatePasswordStrength('Abc1234!')).toBe(true); // 8 chars
      expect(validatePasswordStrength('Abc12345!')).toBe(true); // 9 chars
      expect(validatePasswordStrength('Abc123456789!')).toBe(true); // 13 chars
    });

    it('should fail for empty string', () => {
      expect(validatePasswordStrength('')).toBe(false);
    });

    it('should fail for null or undefined', () => {
      expect(validatePasswordStrength(null as any)).toBe(false);
      expect(validatePasswordStrength(undefined as any)).toBe(false);
    });
  });

  describe('uppercase requirement', () => {
    it('should fail when no uppercase letters present', () => {
      expect(validatePasswordStrength('abcd1234!')).toBe(false);
    });

    it('should pass when at least one uppercase letter present', () => {
      expect(validatePasswordStrength('Abcd1234!')).toBe(true);
    });

    it('should pass with multiple uppercase letters', () => {
      expect(validatePasswordStrength('ABcd1234!')).toBe(true);
      expect(validatePasswordStrength('ABCd1234!')).toBe(true);
    });
  });

  describe('lowercase requirement', () => {
    it('should fail when no lowercase letters present', () => {
      expect(validatePasswordStrength('ABCD1234!')).toBe(false);
    });

    it('should pass when at least one lowercase letter present', () => {
      expect(validatePasswordStrength('ABCd1234!')).toBe(true);
    });

    it('should pass with multiple lowercase letters', () => {
      expect(validatePasswordStrength('ABcd1234!')).toBe(true);
      expect(validatePasswordStrength('abcd1234!A')).toBe(true);
    });
  });

  describe('number requirement', () => {
    it('should fail when no numbers present', () => {
      expect(validatePasswordStrength('Abcdefgh!')).toBe(false);
    });

    it('should pass when at least one number present', () => {
      expect(validatePasswordStrength('Abcdefg1!')).toBe(true);
    });

    it('should pass with multiple numbers', () => {
      expect(validatePasswordStrength('Abc12345!')).toBe(true);
      expect(validatePasswordStrength('123Abcd!')).toBe(true);
    });
  });

  describe('special character requirement', () => {
    it('should fail when no special characters present', () => {
      expect(validatePasswordStrength('Abcd1234')).toBe(false);
    });

    it('should pass with common special characters', () => {
      expect(validatePasswordStrength('Abcd1234!')).toBe(true);
      expect(validatePasswordStrength('Abcd1234@')).toBe(true);
      expect(validatePasswordStrength('Abcd1234#')).toBe(true);
      expect(validatePasswordStrength('Abcd1234$')).toBe(true);
      expect(validatePasswordStrength('Abcd1234%')).toBe(true);
      expect(validatePasswordStrength('Abcd1234^')).toBe(true);
      expect(validatePasswordStrength('Abcd1234&')).toBe(true);
      expect(validatePasswordStrength('Abcd1234*')).toBe(true);
    });

    it('should pass with other special characters', () => {
      expect(validatePasswordStrength('Abcd1234-')).toBe(true);
      expect(validatePasswordStrength('Abcd1234_')).toBe(true);
      expect(validatePasswordStrength('Abcd1234=')).toBe(true);
      expect(validatePasswordStrength('Abcd1234+')).toBe(true);
      expect(validatePasswordStrength('Abcd1234/')).toBe(true);
      expect(validatePasswordStrength('Abcd1234?')).toBe(true);
    });

    it('should pass with space as special character', () => {
      expect(validatePasswordStrength('Abcd 1234')).toBe(true);
    });
  });

  describe('combined requirements', () => {
    it('should fail when missing uppercase', () => {
      expect(validatePasswordStrength('abcd1234!')).toBe(false);
    });

    it('should fail when missing lowercase', () => {
      expect(validatePasswordStrength('ABCD1234!')).toBe(false);
    });

    it('should fail when missing number', () => {
      expect(validatePasswordStrength('Abcdefgh!')).toBe(false);
    });

    it('should fail when missing special character', () => {
      expect(validatePasswordStrength('Abcd1234')).toBe(false);
    });

    it('should fail when too short even if all requirements met', () => {
      expect(validatePasswordStrength('Abc1!')).toBe(false);
    });

    it('should pass when all requirements are met', () => {
      expect(validatePasswordStrength('Password123!')).toBe(true);
      expect(validatePasswordStrength('MyP@ssw0rd')).toBe(true);
      expect(validatePasswordStrength('Tr@ilRun2024')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle unicode characters as special characters', () => {
      expect(validatePasswordStrength('Abcd1234€')).toBe(true);
      expect(validatePasswordStrength('Abcd1234ñ')).toBe(true);
      expect(validatePasswordStrength('Abcd1234ü')).toBe(true);
    });

    it('should handle passwords with only required minimum of each type', () => {
      expect(validatePasswordStrength('Aa1!bcde')).toBe(true); // 1 upper, 1 lower, 1 number, 1 special
    });

    it('should handle very long passwords', () => {
      const longPassword = 'A'.repeat(50) + 'a'.repeat(50) + '1'.repeat(50) + '!';
      expect(validatePasswordStrength(longPassword)).toBe(true);
    });

    it('should handle passwords with mixed special characters', () => {
      expect(validatePasswordStrength('Abc123!@#$%^')).toBe(true);
    });
  });
});
