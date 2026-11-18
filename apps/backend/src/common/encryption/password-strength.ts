export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 4 (similar to zxcvbn)
  errors: string[];
}

export class PasswordStrengthValidator {
  private static readonly COMMON_PATTERNS = [
    'password', '123456', 'qwerty', 'admin', 'welcome', 'letstrackit', 'football', 'monkey'
  ];

  public static validate(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || password.length < 10) {
      errors.push('Password must be at least 10 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      errors.push('Password must contain at least one special symbol');
    }

    const score = this.calculateZxcvbnScore(password);
    if (score < 3) {
      errors.push(`Password strength score is ${score}/4. Minimum score of 3 required.`);
    }

    return {
      isValid: errors.length === 0,
      score,
      errors
    };
  }

  /**
   * Estimates password entropy and pattern strength (0 to 4)
   */
  public static calculateZxcvbnScore(password: string): number {
    if (!password || password.length === 0) return 0;
    if (password.length < 6) return 0;

    let poolSize = 0;
    if (/[a-z]/.test(password)) poolSize += 26;
    if (/[A-Z]/.test(password)) poolSize += 26;
    if (/[0-9]/.test(password)) poolSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

    // Calculate raw entropy bits: L * log2(poolSize)
    const entropy = password.length * Math.log2(poolSize || 1);

    // Apply penalties for common dictionary substrings and repetitions
    let penalty = 0;
    const lower = password.toLowerCase();
    let hasCommonWord = false;
    for (const common of this.COMMON_PATTERNS) {
      if (lower.includes(common)) {
        penalty += 35;
        hasCommonWord = true;
      }
    }

    // Repeated character penalty
    if (/(.)\1{2,}/.test(password)) {
      penalty += 15;
    }

    const effectiveEntropy = Math.max(0, entropy - penalty);

    if (hasCommonWord) {
      return effectiveEntropy >= 60 ? 2 : 1;
    }

    if (effectiveEntropy < 35) return 1;
    if (effectiveEntropy < 50) return 2;
    if (effectiveEntropy < 65) return 3;
    return 4;
  }
}
