/**
 * Validation utility for form fields
 * Provides a reusable pattern for field validation with error messages
 */

export interface ValidationRule<T = string> {
    validate: (value: T) => boolean;
    errorMessage: string;
}

export interface ValidationResult {
    isValid: boolean;
    error: string;
}

/**
 * Generic field validator that runs multiple validation rules
 */
export function validateField<T = string>(
    value: T,
    rules: ValidationRule<T>[]
): ValidationResult {
    for (const rule of rules) {
        if (!rule.validate(value)) {
            return { isValid: false, error: rule.errorMessage };
        }
    }
    return { isValid: true, error: '' };
}

/**
 * Common validation rule factories
 */
export const ValidationRules = {
    required: (errorMessage: string): ValidationRule<string> => ({
        validate: (value: string) => value.trim().length > 0,
        errorMessage,
    }),

    minLength: (min: number, errorMessage: string): ValidationRule<string> => ({
        validate: (value: string) => value.trim().length >= min,
        errorMessage,
    }),

    maxLength: (max: number, errorMessage: string): ValidationRule<string> => ({
        validate: (value: string) => value.trim().length <= max,
        errorMessage,
    }),

    numericRange: (min: number, max: number, errorMessage: string): ValidationRule<string> => ({
        validate: (value: string) => {
            const num = parseFloat(value.replace(',', '.'));
            return !isNaN(num) && num >= min && num < max;
        },
        errorMessage,
    }),

    integerRange: (min: number, max: number, errorMessage: string): ValidationRule<string> => ({
        validate: (value: string) => {
            const num = parseInt(value.trim(), 10);
            return !isNaN(num) && num >= min && num < max;
        },
        errorMessage,
    }),

    noLeadingZeros: (errorMessage: string): ValidationRule<string> => ({
        validate: (value: string) => {
            const trimmed = value.trim();
            // Allow single "0" or "0.x" or "0,x" but not "00", "05", etc.
            const decimalIndex = Math.max(trimmed.indexOf(','), trimmed.indexOf('.'));
            const integerPart = decimalIndex !== -1 ? trimmed.substring(0, decimalIndex) : trimmed;
            return !(integerPart.length > 1 && integerPart.startsWith('0'));
        },
        errorMessage,
    }),

    noDecimals: (errorMessage: string): ValidationRule<string> => ({
        validate: (value: string) => !value.includes('.') && !value.includes(','),
        errorMessage,
    }),

    validUrl: (errorMessage: string): ValidationRule<string> => ({
        validate: (value: string) => {
            const trimmed = value.trim();
            if (!trimmed) return false;

            // Normalize URL: prepend https:// if no protocol
            let normalized = trimmed;
            if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
                normalized = `https://${trimmed}`;
            }

            try {
                const url = new URL(normalized);
                return url.protocol === 'http:' || url.protocol === 'https:';
            } catch {
                return false;
            }
        },
        errorMessage,
    }),

    optionalMinLength: (min: number, errorMessage: string): ValidationRule<string> => ({
        validate: (value: string) => {
            const trimmed = value.trim();
            return trimmed.length === 0 || trimmed.length >= min;
        },
        errorMessage,
    }),
};

/**
 * Normalize a URL by adding https:// if missing
 */
export function normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return `https://${trimmed}`;
    }
    return trimmed;
}

/**
 * Form validation state manager
 * Manages errors for multiple fields in a single state object
 */
export interface FieldErrors {
    [key: string]: string;
}

export interface FormValidator<T extends Record<string, any>> {
    errors: FieldErrors;
    validate: (field: keyof T, value: any, rules: ValidationRule[]) => boolean;
    validateAll: (fields: Partial<Record<keyof T, ValidationRule[]>>, values: T) => boolean;
    clearError: (field: keyof T) => void;
    clearAll: () => void;
    setErrors: (errors: FieldErrors) => void;
}

export function createFormValidator<T extends Record<string, any>>(
    setErrors: (errors: FieldErrors) => void,
    errors: FieldErrors
): FormValidator<T> {
    return {
        errors,
        validate: (field, value, rules) => {
            const result = validateField(value, rules);
            setErrors({ ...errors, [field]: result.error });
            return result.isValid;
        },
        validateAll: (fieldRules, values) => {
            const newErrors: FieldErrors = {};
            let allValid = true;

            for (const [field, rules] of Object.entries(fieldRules)) {
                const value = values[field as keyof T];
                const result = validateField(value, rules as ValidationRule[]);
                newErrors[field] = result.error;
                if (!result.isValid) {
                    allValid = false;
                }
            }

            setErrors(newErrors);
            return allValid;
        },
        clearError: (field) => {
            setErrors({ ...errors, [field]: '' });
        },
        clearAll: () => {
            setErrors({});
        },
        setErrors,
    };
}
