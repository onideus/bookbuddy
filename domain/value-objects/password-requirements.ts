/**
 * Password Requirements Value Object
 *
 * Encapsulates password validation rules as a domain concept.
 * These rules ensure passwords meet modern security standards.
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordRequirements {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;

  /**
   * Common passwords that should be rejected.
   * This is a minimal list - in production, consider using a larger database
   * like the Have I Been Pwned Passwords API.
   */
  private static readonly COMMON_PASSWORDS = new Set([
    'password',
    'password1',
    'password123',
    '12345678',
    '123456789',
    'qwerty123',
    'letmein123',
    'welcome123',
    'admin123',
    'changeme',
  ]);

  /**
   * Validates a password against all requirements.
   * Returns detailed validation results with specific error messages.
   */
  static validate(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password) {
      return {
        isValid: false,
        errors: ['Password is required'],
      };
    }

    // Length checks
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters`);
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`Password must be no more than ${this.MAX_LENGTH} characters`);
    }

    // Character type checks
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Common password check
    if (this.COMMON_PASSWORDS.has(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Returns a user-friendly description of password requirements.
   * Useful for displaying in UI registration forms.
   */
  static getRequirementsDescription(): string[] {
    return [
      `At least ${this.MIN_LENGTH} characters`,
      'At least one uppercase letter (A-Z)',
      'At least one lowercase letter (a-z)',
      'At least one number (0-9)',
      'Not a commonly used password',
    ];
  }
}
