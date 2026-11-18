import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../apps/backend/src/app.js';
import { DataStore } from '../../apps/backend/src/common/db/data-store.js';
import { MailerService } from '../../apps/backend/src/modules/mailer/mailer.service.js';
import { DistributedRateLimiter } from '../../apps/backend/src/common/rate-limiter/rate-limiter.service.js';
import { IdempotencyManager } from '../../apps/backend/src/common/interceptors/idempotency.middleware.js';

describe('API Contract & Integration Verification Matrix', () => {
  const app = buildApp();
  let userToken = '';
  let activeAccountId = '';

  beforeEach(async () => {
    DataStore.clear();
    MailerService.clear();
    DistributedRateLimiter.clear();
    IdempotencyManager.clear();

    // 1. Sign up user
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        fullName: 'Contract Tester',
        email: 'contract@letstrackit.app',
        password: 'Str0ng!Passw0rd#2026',
        currencyPreference: 'INR'
      }
    });
    expect(signupRes.statusCode).toBe(201);

    // 2. Extract OTP and confirm
    const otp = MailerService.getLastSentEmail('contract@letstrackit.app')!.otp!;
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: { email: 'contract@letstrackit.app', otp }
    });
    expect(verifyRes.statusCode).toBe(200);
    userToken = JSON.parse(verifyRes.body).tokens.accessToken;

    // 3. Fetch default accounts
    const accRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/accounts',
      headers: { authorization: `Bearer ${userToken}` }
    });
    expect(accRes.statusCode).toBe(200);
    activeAccountId = JSON.parse(accRes.body)[0].id;
  });

  describe('/api/v1/auth Contract Matrix', () => {
    it('returns structured 422 Unprocessable Entity when password does not meet security rules', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: {
          fullName: 'Weak User',
          email: 'weak@example.com',
          password: 'short'
        }
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('UNPROCESSABLE_ENTITY');
      expect(body.errors).toBeInstanceOf(Array);
      expect(body.errors[0].field).toContain('password');
    });

    it('rejects access to protected routes without token with 401 Unauthorized', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/profile'
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('rejects forged JWT access tokens with 401 Unauthorized', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/profile',
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered' }
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns rate-limiting headers on all responses', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('/api/v1/transactions Contract Matrix', () => {
    it('accepts Idempotency-Key header and prevents duplicate transaction creation', async () => {
      const idemKey = 'idempotency-key-supertest-999';
      const payload = {
        accountId: activeAccountId,
        amount: 850,
        type: 'EXPENSE',
        mode: 'UPI',
        platform: 'Zepto',
        purpose: 'Organic vegetables & dairy',
        category: 'GROCERY'
      };

      // First call
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/transactions',
        headers: {
          authorization: `Bearer ${userToken}`,
          'idempotency-key': idemKey
        },
        payload
      });
      expect(res1.statusCode).toBe(201);
      const created1 = JSON.parse(res1.body);

      // Replay identical call
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/transactions',
        headers: {
          authorization: `Bearer ${userToken}`,
          'idempotency-key': idemKey
        },
        payload
      });
      expect(res2.statusCode).toBe(201);
      expect(res2.headers['idempotency-replay']).toBe('true');
      const created2 = JSON.parse(res2.body);
      expect(created2.id).toBe(created1.id);
    });

    it('creates and tracks Shopping Logistics deliveries through lifecycle', async () => {
      const payload = {
        accountId: activeAccountId,
        amount: 3200,
        type: 'EXPENSE',
        mode: 'CARD',
        platform: 'Amazon',
        purpose: 'Ergonomic Desk Chair Accessories',
        category: 'SHOPPING',
        shoppingDetails: {
          appName: 'Amazon',
          productName: 'Lumbar Support Cushion',
          status: 'ORDERED',
          deliveryDate: '2026-10-15T18:00:00Z'
        }
      };

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/transactions',
        headers: { authorization: `Bearer ${userToken}` },
        payload
      });
      expect(createRes.statusCode).toBe(201);
      const tx = JSON.parse(createRes.body);
      expect(tx.shoppingDetails.status).toBe('ORDERED');

      // Update to SHIPPED
      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/transactions/${tx.id}/delivery-status`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'SHIPPED' }
      });
      expect(patchRes.statusCode).toBe(200);
      const patched = JSON.parse(patchRes.body);
      expect(patched.shoppingDetails.status).toBe('SHIPPED');
    });
  });

  describe('/api/v1/goals Contract Matrix', () => {
    it('creates goal and evaluates progress metrics with Green/Amber/Red thresholds', async () => {
      const month = new Date().toISOString().slice(0, 7);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/goals',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          accountId: activeAccountId,
          category: 'GROCERY',
          targetAmount: 10000,
          month
        }
      });
      expect(res.statusCode).toBe(201);

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/goals?accountId=${activeAccountId}&month=${month}`,
        headers: { authorization: `Bearer ${userToken}` }
      });
      expect(getRes.statusCode).toBe(200);
      const goals = JSON.parse(getRes.body);
      expect(goals).toHaveLength(1);
      expect(goals[0].status).toBe('SAFE');
      expect(goals[0].colorCode).toBe('GREEN');
      expect(goals[0].dailyRecommendedPace).toBeGreaterThan(0);
    });
  });

  describe('/api/v1/ai Contract Matrix', () => {
    it('verifies AI routes are decommissioned and return 404', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/parse-text',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { text: 'Quick Blinkit snacks delivery for 240' }
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
