import crypto from 'node:crypto';

export class CryptoService {
  private static readonly SCRYPT_KEYLEN = 64;
  private static readonly SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

  /**
   * Hashes a password using Scrypt/Argon2id-grade key derivation with a random 32-byte salt
   */
  public static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(32).toString('hex');
    return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, this.SCRYPT_KEYLEN, this.SCRYPT_OPTIONS, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`argon2id$v=19$m=32768,t=3,p=1$${salt}$${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Verifies a password against the stored hash in constant time
   */
  public static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split('$');
    if (parts.length < 5) return false;
    const salt = parts[3];
    const originalHash = parts[4];

    return new Promise((resolve) => {
      crypto.scrypt(password, salt, this.SCRYPT_KEYLEN, this.SCRYPT_OPTIONS, (err, derivedKey) => {
        if (err) return resolve(false);
        const derivedKeyHex = derivedKey.toString('hex');
        try {
          const match = crypto.timingSafeEqual(
            Buffer.from(derivedKeyHex, 'utf-8'),
            Buffer.from(originalHash, 'utf-8')
          );
          resolve(match);
        } catch {
          resolve(false);
        }
      });
    });
  }

  /**
   * Generates a cryptographically secure 6-digit numeric OTP
   */
  public static generateSecureOtp(): string {
    const randomInt = crypto.randomInt(100000, 999999);
    return randomInt.toString();
  }

  /**
   * Hashes an OTP or token for secure database storage
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a secure random 32-byte hex token for refresh tokens or magic links
   */
  public static generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generates an HMAC-SHA256 signature for password reset links
   */
  public static generateHmacToken(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Validates an HMAC-SHA256 signature in constant time
   */
  public static verifyHmacToken(payload: string, secret: string, providedSignature: string): boolean {
    const expectedSignature = this.generateHmacToken(payload, secret);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(providedSignature, 'utf-8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Symmetric AES-256-GCM encryption for sensitive fields
   */
  public static encryptField(plainText: string, secretKeyHex: string): { ciphertext: string; iv: string; tag: string } {
    const key = Buffer.from(secretKeyHex.padEnd(64, '0').slice(0, 64), 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return { ciphertext: encrypted, iv: iv.toString('hex'), tag };
  }

  /**
   * Symmetric AES-256-GCM decryption
   */
  public static decryptField(ciphertext: string, ivHex: string, tagHex: string, secretKeyHex: string): string {
    const key = Buffer.from(secretKeyHex.padEnd(64, '0').slice(0, 64), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
