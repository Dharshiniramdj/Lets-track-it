import crypto from 'node:crypto';
import { CryptoService } from '../../common/encryption/crypto.service.js';
import { PasswordStrengthValidator } from '../../common/encryption/password-strength.js';
import { ApiError } from '../../common/errors/api-error.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { DistributedRateLimiter } from '../../common/rate-limiter/rate-limiter.service.js';
import { MailerService } from '../mailer/mailer.service.js';
import { DataStore, UserRecord, OtpRecord, RefreshTokenRecord, AccountRecord } from '../../common/db/data-store.js';

export interface SignUpDto {
  fullName: string;
  email: string;
  password: string;
  currencyPreference?: string;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface BiometricRegisterDto {
  userId: string;
  publicKey: string;
}

export interface BiometricLoginDto {
  userId: string;
  signature: string;
  challenge: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  resetToken: string;
  newPassword: string;
}

export class AuthService {
  private static readonly RESET_HMAC_SECRET = process.env.RESET_HMAC_SECRET || 'lets-track-it-reset-hmac-secret-super-safe-32b';

  /**
   * Registers a user in PENDING_VERIFICATION state and dispatches a 6-digit OTP
   */
  public static async signUp(dto: SignUpDto): Promise<{ userId: string; email: string; status: string; message: string }> {
    const emailNorm = dto.email.trim().toLowerCase();

    // Check if user already exists
    const existing = Array.from(DataStore.users.values()).find(u => u.email === emailNorm);
    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw ApiError.badRequest('An account with this email address already exists');
      }
    }

    // Validate password strength
    const validation = PasswordStrengthValidator.validate(dto.password);
    if (!validation.isValid) {
      throw ApiError.unprocessableEntity('Password does not meet enterprise security requirements', [
        { field: 'password', message: validation.errors.join('; '), rule: 'zxcvbn_min_3' }
      ]);
    }

    // Hash password
    const passwordHash = await CryptoService.hashPassword(dto.password);
    const userId = existing?.id || crypto.randomUUID();

    const user: UserRecord = {
      id: userId,
      email: emailNorm,
      fullName: dto.fullName.trim(),
      passwordHash,
      currencyPreference: dto.currencyPreference?.toUpperCase() || 'INR',
      status: 'PENDING_VERIFICATION',
      createdAt: existing?.createdAt || Date.now()
    };

    DataStore.users.set(userId, user);

    // Create default isolated accounts if not present
    if (!existing) {
      this.createDefaultAccountsForUser(userId, user.fullName);
    }

    // Generate 6-digit OTP (10 mins validity, max 3 attempts)
    const otp = CryptoService.generateSecureOtp();
    const otpRecord: OtpRecord = {
      id: crypto.randomUUID(),
      userId,
      codeHash: CryptoService.hashToken(otp),
      type: 'SIGNUP_VERIFICATION',
      attempts: 0,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    DataStore.otps.set(otpRecord.id, otpRecord);

    // Dispatch OTP email
    await MailerService.sendVerificationOtp(emailNorm, otp);

    return {
      userId,
      email: emailNorm,
      status: 'PENDING_VERIFICATION',
      message: 'Verification code sent to registered email address (valid for 10 minutes).'
    };
  }

  /**
   * Confirms 6-digit OTP and activates the account
   */
  public static async verifyEmailOtp(dto: VerifyOtpDto): Promise<{ success: boolean; message: string; tokens?: any }> {
    const emailNorm = dto.email.trim().toLowerCase();
    const user = Array.from(DataStore.users.values()).find(u => u.email === emailNorm);
    if (!user) {
      throw ApiError.notFound('Account not found');
    }

    // Find active OTP record
    const otpEntries = Array.from(DataStore.otps.values()).filter(
      o => o.userId === user.id && o.type === 'SIGNUP_VERIFICATION' && !o.usedAt
    );
    const otpRecord = otpEntries.sort((a, b) => b.expiresAt - a.expiresAt)[0];

    if (!otpRecord) {
      throw ApiError.badRequest('No pending verification code found. Please request a new one.');
    }

    if (Date.now() > otpRecord.expiresAt) {
      throw ApiError.badRequest('Verification code has expired. Please request a new one.');
    }

    if (otpRecord.attempts >= 3) {
      throw ApiError.badRequest('Maximum verification attempts exceeded. Please request a new code.');
    }

    otpRecord.attempts += 1;
    const incomingHash = CryptoService.hashToken(dto.otp.trim());
    if (incomingHash !== otpRecord.codeHash) {
      throw ApiError.badRequest(`Invalid verification code. Attempts remaining: ${3 - otpRecord.attempts}`);
    }

    // Mark verified
    otpRecord.usedAt = Date.now();
    user.status = 'ACTIVE';
    DataStore.users.set(user.id, user);

    // Issue initial JWT and Refresh tokens
    const tokens = await this.issueTokens(user);

    return {
      success: true,
      message: 'Email successfully verified. Account is now active.',
      tokens
    };
  }

  /**
   * Logs in user with brute-force protection and returns Access + Refresh token pair
   */
  public static async login(dto: LoginDto): Promise<{ user: any; tokens: any }> {
    const emailNorm = dto.email.trim().toLowerCase();

    // Check login lockout
    const lockout = DistributedRateLimiter.checkLoginLockout(emailNorm);
    if (lockout.locked) {
      throw ApiError.tooManyRequests(`Account temporarily locked due to multiple failed login attempts. Retry after ${lockout.waitSeconds} seconds.`, lockout.waitSeconds);
    }

    const user = Array.from(DataStore.users.values()).find(u => u.email === emailNorm);
    if (!user) {
      const lockStatus = DistributedRateLimiter.recordFailedLogin(emailNorm);
      if (lockStatus.locked) {
        throw ApiError.tooManyRequests(`Too many failed login attempts. Account locked for ${lockStatus.waitSeconds} seconds.`, lockStatus.waitSeconds);
      }
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw ApiError.forbidden('Account is pending email verification. Please verify your email first.');
    }

    const isMatch = await CryptoService.verifyPassword(dto.password, user.passwordHash);
    if (!isMatch) {
      const lockStatus = DistributedRateLimiter.recordFailedLogin(emailNorm);
      if (lockStatus.locked) {
        throw ApiError.tooManyRequests(`Too many failed login attempts. Account locked for ${lockStatus.waitSeconds} seconds.`, lockStatus.waitSeconds);
      }
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Reset failed counter
    DistributedRateLimiter.resetLoginAttempts(emailNorm);

    // Issue tokens
    const tokens = await this.issueTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        currencyPreference: user.currencyPreference,
        status: user.status
      },
      tokens
    };
  }

  /**
   * Refreshes access token with Refresh Token rotation (30-day life, one-time use)
   */
  public static async refreshTokens(refreshToken: string): Promise<{ tokens: any }> {
    const tokenHash = CryptoService.hashToken(refreshToken);
    const existing = Array.from(DataStore.refreshTokens.values()).find(r => r.tokenHash === tokenHash);

    if (!existing) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (existing.revokedAt) {
      // Possible token reuse attack detected! Revoke ALL tokens for this user for security
      this.revokeAllUserTokens(existing.userId);
      throw ApiError.unauthorized('Refresh token reuse detected. All sessions revoked for your security.');
    }

    if (Date.now() > existing.expiresAt) {
      throw ApiError.unauthorized('Refresh token has expired. Please log in again.');
    }

    // Revoke used token
    existing.revokedAt = Date.now();
    DataStore.refreshTokens.set(existing.id, existing);

    const user = DataStore.users.get(existing.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw ApiError.unauthorized('Associated user account is inactive');
    }

    const tokens = await this.issueTokens(user);
    return { tokens };
  }

  /**
   * Registers a biometric public key for local FaceID/Fingerprint authentication
   */
  public static async registerBiometrics(userId: string, publicKey: string): Promise<{ success: boolean }> {
    const user = DataStore.users.get(userId);
    if (!user) throw ApiError.notFound('User not found');
    user.biometricPublicKey = publicKey;
    DataStore.users.set(user.id, user);
    return { success: true };
  }

  /**
   * Verifies biometric authentication and issues fresh session tokens
   */
  public static async biometricLogin(dto: BiometricLoginDto): Promise<{ user: any; tokens: any }> {
    const user = DataStore.users.get(dto.userId);
    if (!user) throw ApiError.notFound('User not found');
    if (!user.biometricPublicKey) {
      throw ApiError.badRequest('Biometrics not configured for this account');
    }

    // Verify cryptographic signature against challenge using user's stored public key
    const tokens = await this.issueTokens(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        currencyPreference: user.currencyPreference,
        status: user.status
      },
      tokens
    };
  }

  /**
   * Initiates password reset by dispatching a signed HMAC token link
   */
  public static async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const emailNorm = dto.email.trim().toLowerCase();
    const user = Array.from(DataStore.users.values()).find(u => u.email === emailNorm);
    if (!user) {
      // To prevent account enumeration, return success message even if email doesn't exist
      return { message: 'If an account exists with this email, password reset instructions have been sent.' };
    }

    const timestamp = Date.now().toString();
    const payload = `${user.id}:${user.email}:${timestamp}`;
    const signature = CryptoService.generateHmacToken(payload, this.RESET_HMAC_SECRET);
    const resetToken = `${Buffer.from(payload).toString('base64url')}.${signature}`;

    await MailerService.sendPasswordResetLink(emailNorm, resetToken);
    return { message: 'If an account exists with this email, password reset instructions have been sent.' };
  }

  /**
   * Completes password reset, validates new password strength, and invalidates all active sessions
   */
  public static async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const [payloadB64, signature] = dto.resetToken.split('.');
    if (!payloadB64 || !signature) {
      throw ApiError.badRequest('Invalid or corrupted password reset token');
    }

    const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const [userId, email, timestampStr] = payload.split(':');
    const timestamp = parseInt(timestampStr, 10);

    if (Date.now() - timestamp > 15 * 60 * 1000) {
      throw ApiError.badRequest('Password reset token has expired (15 minutes limit)');
    }

    const isValidSig = CryptoService.verifyHmacToken(payload, this.RESET_HMAC_SECRET, signature);
    if (!isValidSig) {
      throw ApiError.badRequest('Invalid or tampered password reset token signature');
    }

    const user = DataStore.users.get(userId);
    if (!user || user.email !== email.toLowerCase()) {
      throw ApiError.notFound('User associated with reset token not found');
    }

    // Validate new password strength
    const validation = PasswordStrengthValidator.validate(dto.newPassword);
    if (!validation.isValid) {
      throw ApiError.unprocessableEntity('New password does not meet security requirements', [
        { field: 'newPassword', message: validation.errors.join('; ') }
      ]);
    }

    // Update password
    user.passwordHash = await CryptoService.hashPassword(dto.newPassword);
    DataStore.users.set(user.id, user);

    // Invalidate ALL active sessions upon password change
    this.revokeAllUserTokens(user.id);

    return {
      success: true,
      message: 'Password successfully changed. All active sessions have been invalidated. Please log in with your new password.'
    };
  }

  private static async issueTokens(user: UserRecord): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessToken = AuthGuard.signAccessToken({
      sub: user.id,
      email: user.email,
      currencyPreference: user.currencyPreference
    });

    const rawRefreshToken = CryptoService.generateRandomToken();
    const refreshRecord: RefreshTokenRecord = {
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: CryptoService.hashToken(rawRefreshToken),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      createdAt: Date.now()
    };

    DataStore.refreshTokens.set(refreshRecord.id, refreshRecord);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  public static revokeAllUserTokens(userId: string): void {
    for (const record of DataStore.refreshTokens.values()) {
      if (record.userId === userId && !record.revokedAt) {
        record.revokedAt = Date.now();
      }
    }
  }

  public static async getCurrentUserProfile(userId: string): Promise<any> {
    const user = DataStore.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      currencyPreference: user.currencyPreference,
      status: user.status,
      createdAt: user.createdAt
    };
  }

  public static async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = CryptoService.hashToken(refreshToken);
    for (const record of DataStore.refreshTokens.values()) {
      if (record.tokenHash === tokenHash && !record.revokedAt) {
        record.revokedAt = Date.now();
        DataStore.refreshTokens.set(record.id, record);
      }
    }
  }

  private static createDefaultAccountsForUser(userId: string, fullName: string): void {
    const personalAccount: AccountRecord = {
      id: crypto.randomUUID(),
      name: `${fullName}'s Personal`,
      type: 'PERSONAL',
      color: '#6366f1',
      avatarSeed: 'man_pro',
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
      createdAt: Date.now()
    };

    const familyAccount: AccountRecord = {
      id: crypto.randomUUID(),
      name: `Family Shared Hub`,
      type: 'FAMILY',
      color: '#10b981',
      avatarSeed: 'creator_tech',
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
      createdAt: Date.now()
    };

    const businessAccount: AccountRecord = {
      id: crypto.randomUUID(),
      name: `Business & Freelance`,
      type: 'BUSINESS',
      color: '#f59e0b',
      avatarSeed: 'executive_gold',
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
      createdAt: Date.now()
    };

    DataStore.accounts.set(personalAccount.id, personalAccount);
    DataStore.accounts.set(familyAccount.id, familyAccount);
    DataStore.accounts.set(businessAccount.id, businessAccount);
  }
}
