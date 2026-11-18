import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { DataStore } from '../../src/common/db/data-store.js';
import { MailerService } from '../../src/modules/mailer/mailer.service.js';
import { DistributedRateLimiter } from '../../src/common/rate-limiter/rate-limiter.service.js';

describe('Authentication Flow & Security Domain Tests', () => {
  beforeEach(() => {
    DataStore.clear();
    MailerService.clear();
    DistributedRateLimiter.clear();
  });

  it('registers user in PENDING_VERIFICATION and dispatches 6-digit OTP', async () => {
    const res = await AuthService.signUp({
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'Str0ng!Passw0rd#2026',
      currencyPreference: 'USD'
    });

    expect(res.status).toBe('PENDING_VERIFICATION');
    expect(res.email).toBe('john@example.com');

    const sent = MailerService.getLastSentEmail('john@example.com');
    expect(sent).toBeDefined();
    expect(sent?.otp).toHaveLength(6);
  });

  it('activates user when valid OTP is provided', async () => {
    await AuthService.signUp({
      fullName: 'Alice Smith',
      email: 'alice@example.com',
      password: 'Str0ng!Passw0rd#2026'
    });

    const sentOtp = MailerService.getLastSentEmail('alice@example.com')!.otp!;
    const verifyRes = await AuthService.verifyEmailOtp({
      email: 'alice@example.com',
      otp: sentOtp
    });

    expect(verifyRes.success).toBe(true);
    expect(verifyRes.tokens.accessToken).toBeDefined();
    expect(verifyRes.tokens.refreshToken).toBeDefined();

    const user = Array.from(DataStore.users.values()).find(u => u.email === 'alice@example.com');
    expect(user?.status).toBe('ACTIVE');
  });

  it('rejects login with unverified email', async () => {
    await AuthService.signUp({
      fullName: 'Unverified Bob',
      email: 'bob@example.com',
      password: 'Str0ng!Passw0rd#2026'
    });

    await expect(AuthService.login({
      email: 'bob@example.com',
      password: 'Str0ng!Passw0rd#2026'
    })).rejects.toThrow('Account is pending email verification');
  });

  it('locks out user after 5 failed login attempts with exponential backoff', async () => {
    await AuthService.signUp({
      fullName: 'Target User',
      email: 'target@example.com',
      password: 'Str0ng!Passw0rd#2026'
    });

    const sentOtp = MailerService.getLastSentEmail('target@example.com')!.otp!;
    await AuthService.verifyEmailOtp({ email: 'target@example.com', otp: sentOtp });

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      await expect(AuthService.login({
        email: 'target@example.com',
        password: 'WrongPassword!1'
      })).rejects.toThrow('Invalid email or password');
    }

    // 5th attempt locks out
    await expect(AuthService.login({
      email: 'target@example.com',
      password: 'WrongPassword!1'
    })).rejects.toThrow('Too many failed login attempts. Account locked');

    // 6th attempt is blocked immediately
    await expect(AuthService.login({
      email: 'target@example.com',
      password: 'Str0ng!Passw0rd#2026'
    })).rejects.toThrow('Account temporarily locked');
  });

  it('rotates refresh tokens and detects token reuse attack', async () => {
    await AuthService.signUp({
      fullName: 'Eve Rotate',
      email: 'eve@example.com',
      password: 'Str0ng!Passw0rd#2026'
    });

    const sentOtp = MailerService.getLastSentEmail('eve@example.com')!.otp!;
    const loginRes = await AuthService.verifyEmailOtp({ email: 'eve@example.com', otp: sentOtp });
    const initialRefresh = loginRes.tokens.refreshToken;

    // First rotation succeeds
    const rotated1 = await AuthService.refreshTokens(initialRefresh);
    expect(rotated1.tokens.accessToken).toBeDefined();
    expect(rotated1.tokens.refreshToken).not.toBe(initialRefresh);

    // Replay old refresh token -> attack detection and all sessions revoked
    await expect(AuthService.refreshTokens(initialRefresh)).rejects.toThrow('Refresh token reuse detected');
  });

  it('handles forgot password and revokes all active sessions on reset', async () => {
    await AuthService.signUp({
      fullName: 'Clara Reset',
      email: 'clara@example.com',
      password: 'Str0ng!Passw0rd#2026'
    });

    const sentOtp = MailerService.getLastSentEmail('clara@example.com')!.otp!;
    const loginRes = await AuthService.verifyEmailOtp({ email: 'clara@example.com', otp: sentOtp });
    const activeRefresh = loginRes.tokens.refreshToken;

    await AuthService.forgotPassword({ email: 'clara@example.com' });
    const resetEmail = MailerService.getLastSentEmail('clara@example.com')!;
    const resetToken = resetEmail.link!.split('token=')[1];

    const resetRes = await AuthService.resetPassword({
      email: 'clara@example.com',
      resetToken,
      newPassword: 'BrandNew!Str0ng#Vault2026'
    });

    expect(resetRes.success).toBe(true);

    // Old sessions should be revoked
    await expect(AuthService.refreshTokens(activeRefresh)).rejects.toThrow();
  });
});
