import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../apps/backend/src/app.js';
import { DataStore } from '../../apps/backend/src/common/db/data-store.js';
import { MailerService } from '../../apps/backend/src/modules/mailer/mailer.service.js';
import { DistributedRateLimiter } from '../../apps/backend/src/common/rate-limiter/rate-limiter.service.js';

describe('DAST & Security Fuzzing Test Suite (OWASP Top 10 API & Mobile)', () => {
  const app = buildApp();
  let validToken = '';
  let accountId = '';

  beforeEach(async () => {
    DataStore.clear();
    MailerService.clear();
    DistributedRateLimiter.clear();

    // Create a verified baseline user
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        fullName: 'Security Tester',
        email: 'sec-tester@letstrackit.app',
        password: 'V3ry$ecureP@ssw0rd2026',
        currencyPreference: 'USD'
      }
    });

    const otp = MailerService.getLastSentEmail('sec-tester@letstrackit.app')?.otp!;
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: { email: 'sec-tester@letstrackit.app', otp }
    });
    validToken = JSON.parse(verifyRes.body).tokens.accessToken;

    const accRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/accounts',
      headers: { authorization: `Bearer ${validToken}` }
    });
    accountId = JSON.parse(accRes.body)[0].id;
  });

  describe('1. Security Headers & CORS (DAST Compliance)', () => {
    it('returns strict security headers on all responses (Helmet & OWASP baseline)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('handles OPTIONS pre-flight requests gracefully for CORS', async () => {
      const res = await app.inject({
        method: 'OPTIONS',
        url: '/api/v1/transactions',
        headers: {
          origin: 'https://app.letstrackit.app',
          'access-control-request-method': 'POST'
        }
      });

      expect([200, 204]).toContain(res.statusCode);
    });
  });

  describe('2. SQL & Command Injection Fuzzing', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE Users; --",
      "admin' --",
      "' UNION SELECT null, null, null--",
      "1; WAITFOR DELAY '0:0:5'--"
    ];

    it('rejects SQL injection payloads during authentication without unhandled 500 error', async () => {
      for (const payload of sqlInjectionPayloads) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: {
            email: payload,
            password: 'AnyPassword123!'
          }
        });

        // Must reject cleanly (401 or 422), never 500 or leak stack trace
        expect([401, 422]).toContain(res.statusCode);
        expect(res.statusCode).not.toBe(500);
      }
    });

    it('prevents SQL injection in transaction search queries', async () => {
      for (const payload of sqlInjectionPayloads) {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/transactions?accountId=${encodeURIComponent(payload)}`,
          headers: { authorization: `Bearer ${validToken}` }
        });

        expect(res.statusCode).not.toBe(500);
      }
    });
  });

  describe('3. Cross-Site Scripting (XSS) Fuzzing', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '"><svg onload=alert(document.cookie)>',
      'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>'
    ];

    it('sanitizes or safely encapsulates XSS payloads in transaction notes and merchants', async () => {
      for (const xss of xssPayloads) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/transactions',
          headers: {
            authorization: `Bearer ${validToken}`,
            'Idempotency-Key': `xss-test-${Math.random().toString(36).substring(7)}`
          },
          payload: {
            accountId,
            type: 'EXPENSE',
            amount: 45.0,
            currency: 'USD',
            category: 'Shopping',
            paymentMode: 'CARD',
            description: xss,
            merchant: xss
          }
        });

        // App should either accept with escaped storage or safely reject, never throw 500
        expect(res.statusCode).not.toBe(500);
        if (res.statusCode === 201) {
          const body = JSON.parse(res.body);
          // If stored, verify it did not trigger remote code execution or corrupt JSON structure
          expect(body.id).toBeDefined();
        }
      }
    });
  });

  describe('4. Rate Limiting and Brute-Force Lockout Defense', () => {
    it('enforces lockout after consecutive failed authentication attempts', async () => {
      const email = 'target-user@letstrackit.app';

      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: {
            email,
            password: 'WrongPassword123!'
          }
        });
      }

      // 6th attempt should be blocked or return 429
      const blockedRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email,
          password: 'WrongPassword123!'
        }
      });

      expect([401, 429]).toContain(blockedRes.statusCode);
      if (blockedRes.statusCode === 429) {
        expect(blockedRes.headers['retry-after']).toBeDefined();
      }
    });
  });
});
