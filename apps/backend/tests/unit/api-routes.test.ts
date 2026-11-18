import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { DataStore } from '../../src/common/db/data-store.js';
import { MailerService } from '../../src/modules/mailer/mailer.service.js';
import { DistributedRateLimiter } from '../../src/common/rate-limiter/rate-limiter.service.js';
import { IdempotencyManager } from '../../src/common/interceptors/idempotency.middleware.js';

describe('Fastify REST API Route Contract Tests', () => {
  const app = buildApp();
  let authToken = '';
  let userAccountId = '';

  beforeEach(async () => {
    DataStore.clear();
    MailerService.clear();
    DistributedRateLimiter.clear();
    IdempotencyManager.clear();

    // Setup an authenticated active user
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        fullName: 'E2E Tester',
        email: 'tester@letstrackit.app',
        password: 'Str0ng!Passw0rd#2026',
        currencyPreference: 'INR'
      }
    });

    const otp = MailerService.getLastSentEmail('tester@letstrackit.app')!.otp!;
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: {
        email: 'tester@letstrackit.app',
        otp
      }
    });

    authToken = JSON.parse(verifyRes.body).tokens.accessToken;

    // Get user accounts
    const accRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/accounts',
      headers: { authorization: `Bearer ${authToken}` }
    });
    userAccountId = JSON.parse(accRes.body)[0].id;
  });

  it('GET /health returns 200 and healthy status', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('HEALTHY');
  });

  it('includes rate-limiting headers in API responses', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/profile'
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects forged JWT tokens with 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/profile',
      headers: { authorization: 'Bearer forged.tampered.token' }
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns structured 422 Unprocessable Entity on schema validation failure', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        fullName: 'A', // Too short
        email: 'not-an-email',
        password: 'short'
      }
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('UNPROCESSABLE_ENTITY');
    expect(body.errors).toBeInstanceOf(Array);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it('supports Idempotency-Key header on transaction creation and replays cached result', async () => {
    const idemKey = 'unique-idempotency-key-001';
    const payload = {
      accountId: userAccountId,
      amount: 450,
      type: 'EXPENSE',
      mode: 'UPI',
      platform: 'Zepto',
      purpose: 'Quick groceries',
      category: 'GROCERY'
    };

    // First request -> 201 Created
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: {
        authorization: `Bearer ${authToken}`,
        'idempotency-key': idemKey
      },
      payload
    });
    expect(res1.statusCode).toBe(201);
    const body1 = JSON.parse(res1.body);

    // Duplicate request -> Replayed response
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: {
        authorization: `Bearer ${authToken}`,
        'idempotency-key': idemKey
      },
      payload
    });
    expect(res2.statusCode).toBe(201);
    expect(res2.headers['idempotency-replay']).toBe('true');
    const body2 = JSON.parse(res2.body);
    expect(body2.id).toBe(body1.id);
  });

  it('creates and tracks savings goals and financial summaries', async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Create goal
    const goalRes = await app.inject({
      method: 'POST',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        accountId: userAccountId,
        category: 'GROCERY',
        targetAmount: 5000,
        month: currentMonth
      }
    });
    expect(goalRes.statusCode).toBe(201);

    // Get goals with progress
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/goals?accountId=${userAccountId}`,
      headers: { authorization: `Bearer ${authToken}` }
    });
    expect(listRes.statusCode).toBe(200);
    const goals = JSON.parse(listRes.body);
    expect(goals).toHaveLength(1);
    expect(goals[0].status).toBe('SAFE');
    expect(goals[0].colorCode).toBe('GREEN');
  });

  it('confirms AI routes are disabled', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/parse-text',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        text: 'Paid 350 for dinner at restaurant'
      }
    });

    expect(res.statusCode).toBe(404);
  });
});
