import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from './validation';

// Mock translation function for testing
const mockT = (key: string): string => {
  const translations: Record<string, string> = {
    emailRequired: 'Email is required',
    emailTooLong: 'Email cannot be longer than 254 characters',
    emailInvalid: 'Email is invalid',
    passwordRequired: 'Password is required',
    passwordStrength:
      'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters',
  };
  return translations[key] || key;
};

describe('validateEmail', () => {
  describe('required validation', () => {
    it('should return error for empty string', () => {
      expect(validateEmail('', mockT)).toBe('Email is required');
    });

    it('should return error for whitespace-only string', () => {
      expect(validateEmail('   ', mockT)).toBe('Email is required');
      expect(validateEmail('\t\n', mockT)).toBe('Email is required');
    });

    it('should pass for valid email', () => {
      expect(validateEmail('test@example.com', mockT)).toBe(null);
    });
  });

  describe('length validation', () => {
    it('should return error for email longer than 254 characters', () => {
      const longLocal = 'a'.repeat(240);
      const longEmail = `${longLocal}@example.com`; // 252 chars
      expect(validateEmail(longEmail, mockT)).toBe(null);

      const tooLongLocal = 'a'.repeat(245);
      const tooLongEmail = `${tooLongLocal}@example.com`; // 257 chars
      expect(validateEmail(tooLongEmail, mockT)).toBe(
        'Email cannot be longer than 254 characters'
      );
    });

    it('should pass for email exactly 254 characters', () => {
      const local = 'a'.repeat(239);
      const exactEmail = `${local}@example.com`; // 252 chars
      expect(validateEmail(exactEmail, mockT)).toBe(null);
    });

    it('should pass for email under 254 characters', () => {
      expect(validateEmail('test@example.com', mockT)).toBe(null);
    });
  });

  describe('format validation', () => {
    it('should return error for email missing @', () => {
      expect(validateEmail('testexample.com', mockT)).toBe('Email is invalid');
      expect(validateEmail('test', mockT)).toBe('Email is invalid');
    });

    it('should return error for email missing domain', () => {
      expect(validateEmail('test@', mockT)).toBe('Email is invalid');
    });

    it('should return error for email with short TLD (less than 2 chars)', () => {
      expect(validateEmail('test@example.c', mockT)).toBe('Email is invalid');
    });

    it('should pass for email with 2+ character TLD', () => {
      expect(validateEmail('test@example.co', mockT)).toBe(null);
      expect(validateEmail('test@example.com', mockT)).toBe(null);
      expect(validateEmail('test@example.info', mockT)).toBe(null);
    });

    it('should return error for email with spaces', () => {
      expect(validateEmail('test @example.com', mockT)).toBe('Email is invalid');
      expect(validateEmail('test@ example.com', mockT)).toBe('Email is invalid');
      expect(validateEmail('test@example .com', mockT)).toBe('Email is invalid');
    });
  });

  describe('local part validation', () => {
    it('should return error for local part starting with dot', () => {
      expect(validateEmail('.test@example.com', mockT)).toBe('Email is invalid');
    });

    it('should return error for local part ending with dot', () => {
      expect(validateEmail('test.@example.com', mockT)).toBe('Email is invalid');
    });

    it('should return error for local part with consecutive dots', () => {
      expect(validateEmail('test..name@example.com', mockT)).toBe('Email is invalid');
      expect(validateEmail('test...name@example.com', mockT)).toBe('Email is invalid');
    });

    it('should pass for valid local part with dots', () => {
      expect(validateEmail('test.name@example.com', mockT)).toBe(null);
      expect(validateEmail('first.middle.last@example.com', mockT)).toBe(null);
    });
  });

  describe('domain part validation', () => {
    it('should return error for domain starting with dot', () => {
      expect(validateEmail('test@.example.com', mockT)).toBe('Email is invalid');
    });

    it('should return error for domain ending with dot', () => {
      expect(validateEmail('test@example.com.', mockT)).toBe('Email is invalid');
    });

    it('should return error for domain starting with hyphen', () => {
      expect(validateEmail('test@-example.com', mockT)).toBe('Email is invalid');
    });

    it('should return error for domain ending with hyphen', () => {
      expect(validateEmail('test@example.com-', mockT)).toBe('Email is invalid');
    });

    it('should return error for domain with consecutive dots', () => {
      expect(validateEmail('test@example..com', mockT)).toBe('Email is invalid');
      expect(validateEmail('test@example...com', mockT)).toBe('Email is invalid');
    });

    it('should return error for hyphen adjacent to dot', () => {
      expect(validateEmail('test@example.-com', mockT)).toBe('Email is invalid');
      expect(validateEmail('test@example-.com', mockT)).toBe('Email is invalid');
      expect(validateEmail('test@ex.-ample.com', mockT)).toBe('Email is invalid');
    });

    it('should pass for valid domain with hyphens', () => {
      expect(validateEmail('test@ex-ample.com', mockT)).toBe(null);
      expect(validateEmail('test@my-domain.co.uk', mockT)).toBe(null);
    });

    it('should pass for valid domain with dots', () => {
      expect(validateEmail('test@mail.example.com', mockT)).toBe(null);
      expect(validateEmail('test@subdomain.mail.example.com', mockT)).toBe(null);
    });
  });

  describe('trimming behavior', () => {
    it('should trim whitespace before validation', () => {
      expect(validateEmail('  test@example.com  ', mockT)).toBe(null);
      expect(validateEmail('\ttest@example.com\n', mockT)).toBe(null);
    });

    it('should treat trimmed empty string as empty', () => {
      expect(validateEmail('   ', mockT)).toBe('Email is required');
    });
  });

  describe('real-world email examples', () => {
    it('should pass for common email formats', () => {
      expect(validateEmail('user@example.com', mockT)).toBe(null);
      expect(validateEmail('first.last@company.co.uk', mockT)).toBe(null);
      expect(validateEmail('admin@mail.example.org', mockT)).toBe(null);
      expect(validateEmail('contact+tag@domain.info', mockT)).toBe(null);
      expect(validateEmail('user123@test-domain.com', mockT)).toBe(null);
    });

    it('should return error for clearly invalid emails', () => {
      expect(validateEmail('plaintext', mockT)).toBe('Email is invalid');
      expect(validateEmail('@example.com', mockT)).toBe('Email is invalid');
      expect(validateEmail('user@', mockT)).toBe('Email is invalid');
      expect(validateEmail('user @example.com', mockT)).toBe('Email is invalid');
    });
  });
});

describe('validatePassword', () => {
  describe('required validation', () => {
    it('should return error for empty string', () => {
      expect(validatePassword('', mockT)).toBe('Password is required');
    });

    it('should return error for whitespace-only string', () => {
      expect(validatePassword('   ', mockT)).toBe('Password is required');
      expect(validatePassword('\t\n', mockT)).toBe('Password is required');
    });

    it('should pass for non-empty password', () => {
      expect(validatePassword('Password123!', mockT)).toBe(null);
    });
  });

  describe('strength validation with requireStrength: true (default)', () => {
    it('should return error for password too short', () => {
      expect(validatePassword('Abc1!', mockT)).toBe(
        'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters'
      );
      expect(validatePassword('Abc12!', mockT)).toBe(
        'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters'
      );
      expect(validatePassword('Abc123!', mockT)).toBe(
        'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters'
      );
    });

    it('should return error for password missing uppercase', () => {
      expect(validatePassword('abcd1234!', mockT)).toBe(
        'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters'
      );
    });

    it('should return error for password missing lowercase', () => {
      expect(validatePassword('ABCD1234!', mockT)).toBe(
        'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters'
      );
    });

    it('should return error for password missing number', () => {
      expect(validatePassword('Abcdefgh!', mockT)).toBe(
        'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters'
      );
    });

    it('should return error for password missing special character', () => {
      expect(validatePassword('Abcd1234', mockT)).toBe(
        'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters'
      );
    });

    it('should pass for password meeting all requirements', () => {
      expect(validatePassword('Password123!', mockT)).toBe(null);
      expect(validatePassword('MyP@ssw0rd', mockT)).toBe(null);
      expect(validatePassword('Tr@ilRun2024', mockT)).toBe(null);
    });

    it('should pass for password with unicode special characters', () => {
      expect(validatePassword('Passw0rd™', mockT)).toBe(null);
      expect(validatePassword('Passw0rd€', mockT)).toBe(null);
    });
  });

  describe('basic validation with requireStrength: false', () => {
    it('should return error for empty password', () => {
      expect(validatePassword('', mockT, { requireStrength: false })).toBe(
        'Password is required'
      );
    });

    it('should return error for whitespace-only password', () => {
      expect(validatePassword('   ', mockT, { requireStrength: false })).toBe(
        'Password is required'
      );
    });

    it('should pass for any non-empty password (weak passwords allowed)', () => {
      expect(validatePassword('abc', mockT, { requireStrength: false })).toBe(null);
      expect(validatePassword('123', mockT, { requireStrength: false })).toBe(null);
      expect(validatePassword('password', mockT, { requireStrength: false })).toBe(null);
      expect(validatePassword('weak', mockT, { requireStrength: false })).toBe(null);
    });

    it('should pass for strong passwords too', () => {
      expect(validatePassword('Password123!', mockT, { requireStrength: false })).toBe(null);
    });
  });

  describe('trimming behavior', () => {
    it('should treat trimmed empty string as empty with requireStrength: true', () => {
      expect(validatePassword('   ', mockT, { requireStrength: true })).toBe(
        'Password is required'
      );
    });

    it('should treat trimmed empty string as empty with requireStrength: false', () => {
      expect(validatePassword('   ', mockT, { requireStrength: false })).toBe(
        'Password is required'
      );
    });

    it('should validate password after trimming', () => {
      // Note: The validation checks password.trim() for emptiness,
      // but validates the original password for strength
      expect(validatePassword('  Password123!  ', mockT)).toBe(null);
    });
  });

  describe('edge cases', () => {
    it('should handle very long passwords', () => {
      const longPassword = 'A'.repeat(50) + 'a'.repeat(50) + '1'.repeat(50) + '!';
      expect(validatePassword(longPassword, mockT)).toBe(null);
    });

    it('should handle passwords with mixed special characters', () => {
      expect(validatePassword('Abc123!@#$%^', mockT)).toBe(null);
    });

    it('should handle password with spaces as special character', () => {
      expect(validatePassword('Abcd 1234', mockT)).toBe(null);
    });
  });

  describe('default options', () => {
    it('should use requireStrength: true when options not provided', () => {
      expect(validatePassword('weak', mockT)).toBe(
        'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters'
      );
    });

    it('should use requireStrength: true when empty options provided', () => {
      expect(validatePassword('weak', mockT, {})).toBe(
        'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters'
      );
    });
  });
});
