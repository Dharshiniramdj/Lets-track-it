import { describe, it, expect, beforeEach } from 'vitest';
import { AuthGuard } from '../../src/common/guards/auth.guard.js';
import { IdempotencyManager } from '../../src/common/interceptors/idempotency.middleware.js';
import { DistributedRateLimiter } from '../../src/common/rate-limiter/rate-limiter.service.js';
import { ApiError } from '../../src/common/errors/api-error.js';

describe('Guards, Interceptors & Error Formatter Tests', () => {
  beforeEach(() => {
    IdempotencyManager.clear();
    DistributedRateLimiter.clear();
  });

  describe('AuthGuard & JWT Handling', () => {
    it('signs and verifies valid JWT tokens', () => {
      const token = AuthGuard.signAccessToken({ sub: 'user-jwt-1', email: 'jwt@example.com' });
      expect(token).toBeDefined();

      const decoded = AuthGuard.verifyAccessToken(token);
      expect(decoded.sub).toBe('user-jwt-1');
      expect(decoded.email).toBe('jwt@example.com');
    });

    it('rejects tampered or forged JWT tokens with 401', () => {
      const validToken = AuthGuard.signAccessToken({ sub: 'user-jwt-1', email: 'jwt@example.com' });
      const tampered = validToken.slice(0, -5) + 'xxxxx';

      expect(() => {
        AuthGuard.verifyAccessToken(tampered);
      }).toThrow('Invalid or forged access token');
    });
  });

  describe('IdempotencyManager', () => {
    it('stores and replays cached responses for identical idempotency keys', () => {
      const key = 'idem-key-12345';
      expect(IdempotencyManager.get(key)).toBeUndefined();

      IdempotencyManager.set(key, 201, { id: 'tx-created-1', amount: 500 });
      const cached = IdempotencyManager.get(key);

      expect(cached).toBeDefined();
      expect(cached?.statusCode).toBe(201);
      expect(cached?.body.id).toBe('tx-created-1');
    });
  });

  describe('DistributedRateLimiter', () => {
    it('enforces request count limits and decrements remaining tokens', () => {
      const ip = '192.168.1.100';
      const first = DistributedRateLimiter.checkLimit(ip, 5, 60);
      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(4);

      for (let i = 0; i < 4; i++) {
        DistributedRateLimiter.checkLimit(ip, 5, 60);
      }

      const blocked = DistributedRateLimiter.checkLimit(ip, 5, 60);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });
  });

  describe('ApiError RFC 7807 problem details', () => {
    it('formats unprocessable entity (422) with structured validation error list', () => {
      const error = ApiError.unprocessableEntity('Validation failed', [
        { field: 'amount', message: 'Amount must be positive' }
      ]);

      expect(error.statusCode).toBe(422);
      expect(error.errorType).toBe('UNPROCESSABLE_ENTITY');

      const res = error.toResponse();
      expect(res.status).toBe(422);
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0].field).toBe('amount');
    });

    it('formats 401, 403, 404, and 500 error responses properly', () => {
      expect(ApiError.unauthorized().statusCode).toBe(401);
      expect(ApiError.forbidden().statusCode).toBe(403);
      expect(ApiError.notFound().statusCode).toBe(404);
      expect(ApiError.tooManyRequests().statusCode).toBe(429);
      expect(ApiError.internal().statusCode).toBe(500);
    });
  });
});
