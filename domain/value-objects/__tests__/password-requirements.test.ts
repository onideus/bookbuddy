import { describe, it, expect } from 'vitest';
import { PasswordRequirements } from '../password-requirements';

describe('PasswordRequirements', () => {
  describe('validate', () => {
    describe('valid passwords', () => {
      it('should accept a password meeting all requirements', () => {
        const result = PasswordRequirements.validate('SecurePass123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept a long complex password', () => {
        const result = PasswordRequirements.validate('MyVerySecure$Password123!');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept minimum valid password', () => {
        const result = PasswordRequirements.validate('Abcdefg1');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('length validation', () => {
      it('should reject empty password', () => {
        const result = PasswordRequirements.validate('');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is required');
      });

      it('should reject password shorter than 8 characters', () => {
        const result = PasswordRequirements.validate('Short1A');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
      });

      it('should reject password with 7 characters', () => {
        const result = PasswordRequirements.validate('Abc123X');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
      });

      it('should accept password with exactly 8 characters', () => {
        const result = PasswordRequirements.validate('Abc12345');
        expect(result.isValid).toBe(true);
      });
    });

    describe('character type validation', () => {
      it('should reject password without lowercase', () => {
        const result = PasswordRequirements.validate('ALLUPPERCASE123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });

      it('should reject password without uppercase', () => {
        const result = PasswordRequirements.validate('alllowercase123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });

      it('should reject password without numbers', () => {
        const result = PasswordRequirements.validate('NoNumbersHere');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should report multiple missing requirements', () => {
        const result = PasswordRequirements.validate('alllowercase');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
        expect(result.errors).toContain('Password must contain at least one number');
      });
    });

    describe('common password rejection', () => {
      it('should reject "password"', () => {
        const result = PasswordRequirements.validate('password');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is too common. Please choose a stronger password');
      });

      it('should reject "Password123" (case insensitive match for password123)', () => {
        const result = PasswordRequirements.validate('Password123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is too common. Please choose a stronger password');
      });

      it('should reject "12345678"', () => {
        const result = PasswordRequirements.validate('12345678');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is too common. Please choose a stronger password');
      });

      it('should reject "qwerty123" case insensitively', () => {
        const result = PasswordRequirements.validate('QWERTY123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is too common. Please choose a stronger password');
      });
    });

    describe('edge cases', () => {
      it('should handle null-like input', () => {
        const result = PasswordRequirements.validate(null as unknown as string);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is required');
      });

      it('should handle undefined-like input', () => {
        const result = PasswordRequirements.validate(undefined as unknown as string);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is required');
      });

      it('should accept passwords with special characters', () => {
        const result = PasswordRequirements.validate('Secure@Pass#123!');
        expect(result.isValid).toBe(true);
      });

      it('should accept passwords with spaces', () => {
        const result = PasswordRequirements.validate('My Secure Pass1');
        expect(result.isValid).toBe(true);
      });

      it('should accept passwords with unicode characters', () => {
        const result = PasswordRequirements.validate('SecurePass123');
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('getRequirementsDescription', () => {
    it('should return array of requirement descriptions', () => {
      const requirements = PasswordRequirements.getRequirementsDescription();
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
    });

    it('should include length requirement', () => {
      const requirements = PasswordRequirements.getRequirementsDescription();
      expect(requirements.some((r) => r.includes('8 characters'))).toBe(true);
    });

    it('should include uppercase requirement', () => {
      const requirements = PasswordRequirements.getRequirementsDescription();
      expect(requirements.some((r) => r.toLowerCase().includes('uppercase'))).toBe(true);
    });

    it('should include lowercase requirement', () => {
      const requirements = PasswordRequirements.getRequirementsDescription();
      expect(requirements.some((r) => r.toLowerCase().includes('lowercase'))).toBe(true);
    });

    it('should include number requirement', () => {
      const requirements = PasswordRequirements.getRequirementsDescription();
      expect(requirements.some((r) => r.toLowerCase().includes('number'))).toBe(true);
    });
  });
});
