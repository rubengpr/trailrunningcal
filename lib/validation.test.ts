import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ValidationRules,
  validateField,
  normalizeUrl,
  createFormValidator,
  type ValidationRule,
  type FieldErrors,
} from './validation';

describe('ValidationRules', () => {
  describe('required', () => {
    it('should pass for non-empty strings', () => {
      const rule = ValidationRules.required('Field is required');
      expect(rule.validate('valid')).toBe(true);
    });

    it('should fail for empty strings', () => {
      const rule = ValidationRules.required('Field is required');
      expect(rule.validate('')).toBe(false);
    });

    it('should fail for whitespace-only strings', () => {
      const rule = ValidationRules.required('Field is required');
      expect(rule.validate('   ')).toBe(false);
      expect(rule.validate('\t')).toBe(false);
      expect(rule.validate('\n')).toBe(false);
    });

    it('should trim and validate correctly', () => {
      const rule = ValidationRules.required('Field is required');
      expect(rule.validate('  text  ')).toBe(true);
    });
  });

  describe('minLength', () => {
    it('should pass when string meets minimum length', () => {
      const rule = ValidationRules.minLength(5, 'Must be at least 5 characters');
      expect(rule.validate('12345')).toBe(true);
      expect(rule.validate('123456')).toBe(true);
    });

    it('should fail when string is shorter than minimum', () => {
      const rule = ValidationRules.minLength(5, 'Must be at least 5 characters');
      expect(rule.validate('1234')).toBe(false);
      expect(rule.validate('abc')).toBe(false);
    });

    it('should trim before checking length', () => {
      const rule = ValidationRules.minLength(5, 'Must be at least 5 characters');
      expect(rule.validate('  12345  ')).toBe(true);
      expect(rule.validate('  123  ')).toBe(false);
    });

    it('should handle edge case of length exactly at minimum', () => {
      const rule = ValidationRules.minLength(3, 'Must be at least 3 characters');
      expect(rule.validate('abc')).toBe(true);
    });
  });

  describe('maxLength', () => {
    it('should pass when string is within maximum length', () => {
      const rule = ValidationRules.maxLength(10, 'Must be at most 10 characters');
      expect(rule.validate('12345')).toBe(true);
      expect(rule.validate('1234567890')).toBe(true);
    });

    it('should fail when string exceeds maximum length', () => {
      const rule = ValidationRules.maxLength(10, 'Must be at most 10 characters');
      expect(rule.validate('12345678901')).toBe(false);
    });

    it('should trim before checking length', () => {
      const rule = ValidationRules.maxLength(5, 'Must be at most 5 characters');
      expect(rule.validate('  12345  ')).toBe(true);
      expect(rule.validate('  123456  ')).toBe(false);
    });

    it('should handle edge case of length exactly at maximum', () => {
      const rule = ValidationRules.maxLength(5, 'Must be at most 5 characters');
      expect(rule.validate('12345')).toBe(true);
    });
  });

  describe('numericRange', () => {
    it('should pass for numbers within range', () => {
      const rule = ValidationRules.numericRange(0, 100, 'Must be between 0 and 100');
      expect(rule.validate('50')).toBe(true);
      expect(rule.validate('0')).toBe(true);
      expect(rule.validate('99')).toBe(true);
    });

    it('should fail for numbers outside range', () => {
      const rule = ValidationRules.numericRange(0, 100, 'Must be between 0 and 100');
      expect(rule.validate('100')).toBe(false); // max is exclusive
      expect(rule.validate('150')).toBe(false);
      expect(rule.validate('-1')).toBe(false);
    });

    it('should handle decimal numbers', () => {
      const rule = ValidationRules.numericRange(0, 100, 'Must be between 0 and 100');
      expect(rule.validate('50.5')).toBe(true);
      expect(rule.validate('0.1')).toBe(true);
      expect(rule.validate('99.9')).toBe(true);
    });

    it('should handle comma as decimal separator', () => {
      const rule = ValidationRules.numericRange(0, 100, 'Must be between 0 and 100');
      expect(rule.validate('50,5')).toBe(true);
      expect(rule.validate('99,9')).toBe(true);
    });

    it('should fail for non-numeric strings', () => {
      const rule = ValidationRules.numericRange(0, 100, 'Must be between 0 and 100');
      expect(rule.validate('abc')).toBe(false);
      expect(rule.validate('')).toBe(false);
    });

    it('should handle boundary conditions (min inclusive, max exclusive)', () => {
      const rule = ValidationRules.numericRange(10, 20, 'Must be between 10 and 20');
      expect(rule.validate('10')).toBe(true);
      expect(rule.validate('20')).toBe(false);
      expect(rule.validate('19.99')).toBe(true);
    });
  });

  describe('integerRange', () => {
    it('should pass for integers within range', () => {
      const rule = ValidationRules.integerRange(0, 100, 'Must be between 0 and 100');
      expect(rule.validate('50')).toBe(true);
      expect(rule.validate('0')).toBe(true);
      expect(rule.validate('99')).toBe(true);
    });

    it('should fail for integers outside range', () => {
      const rule = ValidationRules.integerRange(0, 100, 'Must be between 0 and 100');
      expect(rule.validate('100')).toBe(false); // max is exclusive
      expect(rule.validate('150')).toBe(false);
      expect(rule.validate('-1')).toBe(false);
    });

    it('should truncate decimal numbers to integers', () => {
      const rule = ValidationRules.integerRange(0, 100, 'Must be between 0 and 100');
      // parseInt truncates decimals, so '50.5' becomes 50
      expect(rule.validate('50.5')).toBe(true);
      expect(rule.validate('0.1')).toBe(true);
      expect(rule.validate('99.9')).toBe(true);
    });

    it('should fail for non-numeric strings', () => {
      const rule = ValidationRules.integerRange(0, 100, 'Must be between 0 and 100');
      expect(rule.validate('abc')).toBe(false);
      expect(rule.validate('')).toBe(false);
    });

    it('should trim whitespace before parsing', () => {
      const rule = ValidationRules.integerRange(0, 100, 'Must be between 0 and 100');
      expect(rule.validate('  50  ')).toBe(true);
    });

    it('should handle boundary conditions (min inclusive, max exclusive)', () => {
      const rule = ValidationRules.integerRange(10, 20, 'Must be between 10 and 20');
      expect(rule.validate('10')).toBe(true);
      expect(rule.validate('20')).toBe(false);
      expect(rule.validate('19')).toBe(true);
    });
  });

  describe('noLeadingZeros', () => {
    it('should pass for numbers without leading zeros', () => {
      const rule = ValidationRules.noLeadingZeros('No leading zeros allowed');
      expect(rule.validate('1')).toBe(true);
      expect(rule.validate('10')).toBe(true);
      expect(rule.validate('123')).toBe(true);
    });

    it('should allow single zero', () => {
      const rule = ValidationRules.noLeadingZeros('No leading zeros allowed');
      expect(rule.validate('0')).toBe(true);
    });

    it('should allow zero with decimal part', () => {
      const rule = ValidationRules.noLeadingZeros('No leading zeros allowed');
      expect(rule.validate('0.5')).toBe(true);
      expect(rule.validate('0,5')).toBe(true);
    });

    it('should fail for numbers with leading zeros', () => {
      const rule = ValidationRules.noLeadingZeros('No leading zeros allowed');
      expect(rule.validate('05')).toBe(false);
      expect(rule.validate('00')).toBe(false);
      expect(rule.validate('0123')).toBe(false);
    });

    it('should handle whitespace trimming', () => {
      const rule = ValidationRules.noLeadingZeros('No leading zeros allowed');
      expect(rule.validate('  05  ')).toBe(false);
      expect(rule.validate('  5  ')).toBe(true);
    });
  });

  describe('noDecimals', () => {
    it('should pass for integers', () => {
      const rule = ValidationRules.noDecimals('No decimals allowed');
      expect(rule.validate('123')).toBe(true);
      expect(rule.validate('0')).toBe(true);
    });

    it('should fail for numbers with dot decimal separator', () => {
      const rule = ValidationRules.noDecimals('No decimals allowed');
      expect(rule.validate('12.5')).toBe(false);
      expect(rule.validate('0.1')).toBe(false);
    });

    it('should fail for numbers with comma decimal separator', () => {
      const rule = ValidationRules.noDecimals('No decimals allowed');
      expect(rule.validate('12,5')).toBe(false);
      expect(rule.validate('0,1')).toBe(false);
    });
  });

  describe('validUrl', () => {
    it('should pass for valid URLs with protocol', () => {
      const rule = ValidationRules.validUrl('Invalid URL');
      expect(rule.validate('https://example.com')).toBe(true);
      expect(rule.validate('http://example.com')).toBe(true);
    });

    it('should pass for URLs without protocol (auto-adds https://)', () => {
      const rule = ValidationRules.validUrl('Invalid URL');
      expect(rule.validate('example.com')).toBe(true);
      expect(rule.validate('www.example.com')).toBe(true);
    });

    it('should fail for empty strings', () => {
      const rule = ValidationRules.validUrl('Invalid URL');
      expect(rule.validate('')).toBe(false);
      expect(rule.validate('   ')).toBe(false);
    });

    it('should fail for invalid URLs', () => {
      const rule = ValidationRules.validUrl('Invalid URL');
      expect(rule.validate('not a url')).toBe(false);
      expect(rule.validate('http://')).toBe(false); // Incomplete URL
    });

    it('should handle complex URLs', () => {
      const rule = ValidationRules.validUrl('Invalid URL');
      expect(rule.validate('https://example.com/path?query=value')).toBe(true);
      expect(rule.validate('example.com/path/to/resource')).toBe(true);
    });
  });

  describe('optionalMinLength', () => {
    it('should pass for empty strings', () => {
      const rule = ValidationRules.optionalMinLength(5, 'Must be at least 5 characters');
      expect(rule.validate('')).toBe(true);
      expect(rule.validate('   ')).toBe(true);
    });

    it('should pass when string meets minimum length', () => {
      const rule = ValidationRules.optionalMinLength(5, 'Must be at least 5 characters');
      expect(rule.validate('12345')).toBe(true);
      expect(rule.validate('123456')).toBe(true);
    });

    it('should fail when string is provided but shorter than minimum', () => {
      const rule = ValidationRules.optionalMinLength(5, 'Must be at least 5 characters');
      expect(rule.validate('1234')).toBe(false);
      expect(rule.validate('abc')).toBe(false);
    });

    it('should trim before checking', () => {
      const rule = ValidationRules.optionalMinLength(5, 'Must be at least 5 characters');
      expect(rule.validate('  12345  ')).toBe(true);
      expect(rule.validate('  123  ')).toBe(false);
    });
  });
});

describe('validateField', () => {
  it('should return valid when all rules pass', () => {
    const rules: ValidationRule[] = [
      ValidationRules.required('Required'),
      ValidationRules.minLength(3, 'Min 3'),
    ];
    const result = validateField('test', rules);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });

  it('should return first error when a rule fails', () => {
    const rules: ValidationRule[] = [
      ValidationRules.required('Required'),
      ValidationRules.minLength(10, 'Min 10'),
    ];
    const result = validateField('test', rules);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Min 10');
  });

  it('should stop at first failing rule', () => {
    const rules: ValidationRule[] = [
      ValidationRules.minLength(10, 'Min 10'),
      ValidationRules.maxLength(5, 'Max 5'), // This would also fail but shouldn't be checked
    ];
    const result = validateField('test', rules);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Min 10');
  });

  it('should handle empty rules array', () => {
    const result = validateField('test', []);
    expect(result.isValid).toBe(true);
    expect(result.error).toBe('');
  });
});

describe('normalizeUrl', () => {
  it('should add https:// to URLs without protocol', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
  });

  it('should not modify URLs that already have https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('should not modify URLs that already have http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('should trim whitespace before processing', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com');
  });

  it('should handle empty strings', () => {
    expect(normalizeUrl('')).toBe('https://');
    expect(normalizeUrl('   ')).toBe('https://');
  });
});

describe('createFormValidator', () => {
  let errors: FieldErrors;
  let setErrors: (newErrors: FieldErrors) => void;

  interface TestFormFields {
    name: string;
    email: string;
  }

  beforeEach(() => {
    errors = {};
    setErrors = vi.fn((newErrors) => {
      errors = newErrors;
    });
  });

  describe('validate', () => {
    it('should validate a single field and update errors', () => {
      const validator = createFormValidator<TestFormFields>(setErrors, errors);
      const rules = [ValidationRules.required('Required')];

      const result = validator.validate('name', 'test', rules);

      expect(result).toBe(true);
      expect(setErrors).toHaveBeenCalledWith({ name: '' });
    });

    it('should set error when validation fails', () => {
      const validator = createFormValidator<TestFormFields>(setErrors, errors);
      const rules = [ValidationRules.required('Required')];

      const result = validator.validate('name', '', rules);

      expect(result).toBe(false);
      expect(setErrors).toHaveBeenCalledWith({ name: 'Required' });
    });

    it('should preserve existing errors for other fields', () => {
      const existingErrors = { email: 'Invalid email' };
      const validator = createFormValidator<TestFormFields>(setErrors, existingErrors);
      const rules = [ValidationRules.required('Required')];

      validator.validate('name', '', rules);

      expect(setErrors).toHaveBeenCalledWith({ email: 'Invalid email', name: 'Required' });
    });
  });

  describe('validateAll', () => {
    it('should validate multiple fields and return true when all pass', () => {
      const validator = createFormValidator<TestFormFields>(setErrors, errors);
      const fieldRules = {
        name: [ValidationRules.required('Name required')],
        email: [ValidationRules.required('Email required')],
      };
      const values = { name: 'John', email: 'john@example.com' };

      const result = validator.validateAll(fieldRules, values);

      expect(result).toBe(true);
      expect(setErrors).toHaveBeenCalledWith({ name: '', email: '' });
    });

    it('should validate multiple fields and return false when any fail', () => {
      const validator = createFormValidator<TestFormFields>(setErrors, errors);
      const fieldRules = {
        name: [ValidationRules.required('Name required')],
        email: [ValidationRules.required('Email required')],
      };
      const values = { name: 'John', email: '' };

      const result = validator.validateAll(fieldRules, values);

      expect(result).toBe(false);
      expect(setErrors).toHaveBeenCalledWith({ name: '', email: 'Email required' });
    });

    it('should collect all errors even when multiple fields fail', () => {
      const validator = createFormValidator<TestFormFields>(setErrors, errors);
      const fieldRules = {
        name: [ValidationRules.required('Name required')],
        email: [ValidationRules.required('Email required')],
      };
      const values = { name: '', email: '' };

      const result = validator.validateAll(fieldRules, values);

      expect(result).toBe(false);
      expect(setErrors).toHaveBeenCalledWith({
        name: 'Name required',
        email: 'Email required'
      });
    });
  });

  describe('clearError', () => {
    it('should clear error for a specific field', () => {
      const existingErrors = { name: 'Required', email: 'Invalid' };
      const validator = createFormValidator<TestFormFields>(setErrors, existingErrors);

      validator.clearError('name');

      expect(setErrors).toHaveBeenCalledWith({ name: '', email: 'Invalid' });
    });
  });

  describe('clearAll', () => {
    it('should clear all errors', () => {
      const existingErrors = { name: 'Required', email: 'Invalid' };
      const validator = createFormValidator<TestFormFields>(setErrors, existingErrors);

      validator.clearAll();

      expect(setErrors).toHaveBeenCalledWith({});
    });
  });

  describe('setErrors', () => {
    it('should expose setErrors method', () => {
      const validator = createFormValidator<TestFormFields>(setErrors, errors);
      const newErrors = { name: 'Error 1', email: 'Error 2' };

      validator.setErrors(newErrors);

      expect(setErrors).toHaveBeenCalledWith(newErrors);
    });
  });
});
