import { describe, it, expect } from 'vitest';
import { PasswordStrengthValidator } from '../../src/common/encryption/password-strength.js';

describe('Password Security & zxcvbn Strength Verification', () => {
  it('rejects passwords shorter than 10 characters', () => {
    const result = PasswordStrengthValidator.validate('Short1!Aa');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 10 characters long');
  });

  it('rejects passwords missing uppercase letters', () => {
    const result = PasswordStrengthValidator.validate('lowercase123!@#');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('rejects passwords missing lowercase letters', () => {
    const result = PasswordStrengthValidator.validate('UPPERCASE123!@#');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('rejects passwords missing numbers', () => {
    const result = PasswordStrengthValidator.validate('NoNumbersHere!@#');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('rejects passwords missing special symbols', () => {
    const result = PasswordStrengthValidator.validate('NoSpecialSymbols1234');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special symbol');
  });

  it('rejects common dictionary words even if meeting character sets', () => {
    const result = PasswordStrengthValidator.validate('Password123!');
    expect(result.isValid).toBe(false); // zxcvbn penalty drops score
  });

  it('accepts strong, high-entropy enterprise passwords', () => {
    const result = PasswordStrengthValidator.validate('Str0ng!Vault#2026Secure');
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.errors.length).toBe(0);
  });
});
