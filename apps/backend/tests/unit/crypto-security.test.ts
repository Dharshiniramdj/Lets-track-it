import { describe, it, expect } from 'vitest';
import { CryptoService } from '../../src/common/encryption/crypto.service.js';

describe('Cryptographic Services & Constant-Time Security Verification', () => {
  it('hashes passwords using Argon2id/scrypt and verifies valid match', async () => {
    const rawPass = 'Sup3rSecure!Password2026';
    const hash = await CryptoService.hashPassword(rawPass);

    expect(hash).toContain('argon2id');
    const isMatch = await CryptoService.verifyPassword(rawPass, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await CryptoService.verifyPassword('WrongPassword123!', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('generates cryptographically secure 6-digit numeric OTPs', () => {
    for (let i = 0; i < 50; i++) {
      const otp = CryptoService.generateSecureOtp();
      expect(otp).toHaveLength(6);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('signs and verifies HMAC tokens and detects tampering', () => {
    const payload = 'user-123:user@example.com:1700000000';
    const secret = 'super-secret-hmac-key';

    const sig = CryptoService.generateHmacToken(payload, secret);
    expect(CryptoService.verifyHmacToken(payload, secret, sig)).toBe(true);

    // Tampered payload
    expect(CryptoService.verifyHmacToken(payload + '-tampered', secret, sig)).toBe(false);

    // Tampered signature
    expect(CryptoService.verifyHmacToken(payload, secret, sig.slice(0, -2) + 'aa')).toBe(false);
  });

  it('performs symmetric AES-256-GCM encryption and decryption round-trip', () => {
    const secret = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';
    const secretText = 'CONFIDENTIAL_FINANCIAL_ACCOUNT_NUMBER_9999';

    const encrypted = CryptoService.encryptField(secretText, secret);
    expect(encrypted.ciphertext).not.toBe(secretText);
    expect(encrypted.iv).toHaveLength(24); // 12 bytes in hex

    const decrypted = CryptoService.decryptField(encrypted.ciphertext, encrypted.iv, encrypted.tag, secret);
    expect(decrypted).toBe(secretText);
  });
});
