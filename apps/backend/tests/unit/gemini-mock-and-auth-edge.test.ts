import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiService } from '../../src/modules/ai/gemini.service.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { CryptoService } from '../../src/common/encryption/crypto.service.js';
import { DataStore, AccountRecord, UserRecord, OtpRecord } from '../../src/common/db/data-store.js';
import { MailerService } from '../../src/modules/mailer/mailer.service.js';
import { DistributedRateLimiter } from '../../src/common/rate-limiter/rate-limiter.service.js';

describe('Gemini Client Mocking & Auth Edge Cases', () => {
  const userId = 'user-edge-1';
  const accountId = 'acc-edge-1';

  beforeEach(() => {
    DataStore.clear();
    MailerService.clear();
    DistributedRateLimiter.clear();
    vi.restoreAllMocks();

    const user: UserRecord = {
      id: userId,
      email: 'edge@example.com',
      fullName: 'Edge Case User',
      passwordHash: 'hash',
      currencyPreference: 'INR',
      status: 'ACTIVE',
      createdAt: Date.now()
    };
    DataStore.users.set(userId, user);

    const account: AccountRecord = {
      id: accountId,
      name: 'Primary Checking',
      type: 'PERSONAL',
      color: '#6366f1',
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
      createdAt: Date.now()
    };
    DataStore.accounts.set(accountId, account);
  });

  describe('GeminiService with mocked GoogleGenAI client', () => {
    it('calls client.models.generateContent for chat when client is present', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: 'This is a mocked Gemini response with rich advice.'
      });

      const mockClient = {
        models: {
          generateContent: mockGenerateContent
        }
      } as any;

      vi.spyOn(GeminiService, 'getClient').mockReturnValue(mockClient);

      const res = await GeminiService.chat(userId, {
        role: 'COACH',
        messages: [{ role: 'user', content: 'Help me save money on groceries' }],
        accountId
      });

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(res.response).toBe('This is a mocked Gemini response with rich advice.');
    });

    it('handles Gemini API error gracefully in chat', async () => {
      vi.spyOn(GeminiService, 'getClient').mockReturnValue({
        models: {
          generateContent: vi.fn().mockRejectedValue(new Error('API quota exceeded'))
        }
      } as any);

      const res = await GeminiService.chat(userId, {
        role: 'COACH',
        messages: [{ role: 'user', content: 'Hello' }],
        accountId
      });

      expect(res.response).toContain('Advisor encountered an issue: API quota exceeded');
    });

    it('parses natural language with mocked Gemini client response', async () => {
      vi.spyOn(GeminiService, 'getClient').mockReturnValue({
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({
              amount: 1200,
              type: 'EXPENSE',
              mode: 'UPI',
              platform: 'Swiggy',
              purpose: 'Team Lunch',
              category: 'FOOD',
              isShopping: false
            })
          })
        }
      } as any);

      const parsed = await GeminiService.parseNaturalLanguage('Spent 1200 on Swiggy lunch');
      expect(parsed.amount).toBe(1200);
      expect(parsed.platform).toBe('Swiggy');
      expect(parsed.category).toBe('FOOD');
    });

    it('parses receipt image with mocked Gemini client response', async () => {
      vi.spyOn(GeminiService, 'getClient').mockReturnValue({
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({
              amount: 2850,
              type: 'EXPENSE',
              mode: 'CARD',
              platform: 'Croma Retail',
              purpose: 'USB-C Hub',
              category: 'ELECTRONICS'
            })
          })
        }
      } as any);

      const parsed = await GeminiService.parseReceiptImage('data:image/jpeg;base64,mockbase64data');
      expect(parsed.amount).toBe(2850);
      expect(parsed.platform).toBe('Croma Retail');
      expect(parsed.category).toBe('ELECTRONICS');
    });
  });

  describe('AuthService Edge Cases', () => {
    it('rejects signup if an active account already exists with that email', async () => {
      await AuthService.signUp({
        fullName: 'First John',
        email: 'duplicate@example.com',
        password: 'Str0ng!Passw0rd#2026'
      });

      const otp = MailerService.getLastSentEmail('duplicate@example.com')!.otp!;
      await AuthService.verifyEmailOtp({ email: 'duplicate@example.com', otp });

      await expect(
        AuthService.signUp({
          fullName: 'Second John',
          email: 'duplicate@example.com',
          password: 'Str0ng!Passw0rd#2026'
        })
      ).rejects.toThrow('An account with this email address already exists');
    });

    it('rejects OTP verification when OTP is expired or attempts exceed 3', async () => {
      await AuthService.signUp({
        fullName: 'Expire Test',
        email: 'expire@example.com',
        password: 'Str0ng!Passw0rd#2026'
      });

      const otpEntry = Array.from(DataStore.otps.values()).find(
        o => o.userId === Array.from(DataStore.users.values()).find(u => u.email === 'expire@example.com')?.id
      )!;

      // Expire OTP
      otpEntry.expiresAt = Date.now() - 1000;
      await expect(
        AuthService.verifyEmailOtp({ email: 'expire@example.com', otp: '123456' })
      ).rejects.toThrow('Verification code has expired');

      // Reset expiry and test max attempts
      otpEntry.expiresAt = Date.now() + 600000;
      otpEntry.attempts = 3;
      await expect(
        AuthService.verifyEmailOtp({ email: 'expire@example.com', otp: '123456' })
      ).rejects.toThrow('Maximum verification attempts exceeded');
    });

    it('rejects biometric login when biometrics are not configured', async () => {
      await expect(
        AuthService.biometricLogin({
          userId,
          signature: 'sig',
          challenge: 'challenge'
        })
      ).rejects.toThrow('Biometrics not configured for this account');
    });

    it('rejects reset password with expired token', async () => {
      const expiredPayload = `${userId}:edge@example.com:${Date.now() - 20 * 60 * 1000}`;
      const sig = CryptoService.generateHmacToken(expiredPayload, 'lets-track-it-reset-hmac-secret-super-safe-32b');
      const resetToken = `${Buffer.from(expiredPayload).toString('base64url')}.${sig}`;

      await expect(
        AuthService.resetPassword({
          email: 'edge@example.com',
          resetToken,
          newPassword: 'New!Str0ng#Vault2026'
        })
      ).rejects.toThrow('Password reset token has expired');
    });

    it('rejects reset password with invalid signature', async () => {
      const validPayload = `${userId}:edge@example.com:${Date.now()}`;
      const resetToken = `${Buffer.from(validPayload).toString('base64url')}.invalidsignature123`;

      await expect(
        AuthService.resetPassword({
          email: 'edge@example.com',
          resetToken,
          newPassword: 'New!Str0ng#Vault2026'
        })
      ).rejects.toThrow('Invalid or tampered password reset token signature');
    });
  });
});
