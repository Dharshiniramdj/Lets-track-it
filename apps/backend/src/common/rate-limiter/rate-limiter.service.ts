import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiError } from '../errors/api-error.js';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface LoginAttemptTracker {
  failedAttempts: number;
  lockedUntil: number;
  lastAttemptAt: number;
}

export class DistributedRateLimiter {
  private static ipBuckets = new Map<string, RateLimitBucket>();
  private static loginAttempts = new Map<string, LoginAttemptTracker>();

  /**
   * General API rate limiting: 100 requests per 60 seconds by default
   */
  public static checkLimit(
    identifier: string,
    limit = 100,
    windowSec = 60
  ): { allowed: boolean; limit: number; remaining: number; reset: number } {
    const now = Date.now();
    const existing = this.ipBuckets.get(identifier);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + windowSec * 1000;
      this.ipBuckets.set(identifier, { count: 1, resetAt });
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        reset: Math.ceil((resetAt - now) / 1000)
      };
    }

    existing.count += 1;
    const remaining = Math.max(0, limit - existing.count);
    const reset = Math.ceil((existing.resetAt - now) / 1000);

    return {
      allowed: existing.count <= limit,
      limit,
      remaining,
      reset
    };
  }

  /**
   * Records a failed login attempt with exponential backoff after 5 failures
   */
  public static recordFailedLogin(emailOrIp: string): { locked: boolean; waitSeconds: number } {
    const now = Date.now();
    const tracker = this.loginAttempts.get(emailOrIp) || {
      failedAttempts: 0,
      lockedUntil: 0,
      lastAttemptAt: now
    };

    tracker.failedAttempts += 1;
    tracker.lastAttemptAt = now;

    if (tracker.failedAttempts >= 5) {
      // Exponential backoff: 2^(failedAttempts - 4) * 30 seconds
      const backoffMultiplier = Math.pow(2, tracker.failedAttempts - 5);
      const lockDurationMs = Math.min(30 * 60 * 1000, backoffMultiplier * 30 * 1000); // Max 30 mins
      tracker.lockedUntil = now + lockDurationMs;
      this.loginAttempts.set(emailOrIp, tracker);
      return { locked: true, waitSeconds: Math.ceil(lockDurationMs / 1000) };
    }

    this.loginAttempts.set(emailOrIp, tracker);
    return { locked: false, waitSeconds: 0 };
  }

  /**
   * Checks if an account/IP is locked out from login
   */
  public static checkLoginLockout(emailOrIp: string): { locked: boolean; waitSeconds: number } {
    const tracker = this.loginAttempts.get(emailOrIp);
    if (!tracker) return { locked: false, waitSeconds: 0 };

    const now = Date.now();
    if (now < tracker.lockedUntil) {
      return { locked: true, waitSeconds: Math.ceil((tracker.lockedUntil - now) / 1000) };
    }

    // Expired lockout
    if (now - tracker.lastAttemptAt > 60 * 60 * 1000) {
      this.loginAttempts.delete(emailOrIp);
    }
    return { locked: false, waitSeconds: 0 };
  }

  /**
   * Resets login attempt count upon successful authentication
   */
  public static resetLoginAttempts(emailOrIp: string): void {
    this.loginAttempts.delete(emailOrIp);
  }

  public static clear(): void {
    this.ipBuckets.clear();
    this.loginAttempts.clear();
  }
}

export async function rateLimitInterceptor(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const clientIp = request.ip || '127.0.0.1';
  const { allowed, limit, remaining, reset } = DistributedRateLimiter.checkLimit(clientIp);

  reply.header('X-RateLimit-Limit', limit.toString());
  reply.header('X-RateLimit-Remaining', remaining.toString());
  reply.header('X-RateLimit-Reset', reset.toString());

  if (!allowed) {
    reply.header('Retry-After', reset.toString());
    throw ApiError.tooManyRequests(`Rate limit exceeded. Try again in ${reset} seconds.`);
  }
}
