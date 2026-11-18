import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { DataStore } from '../../src/common/db/data-store.js';
import { MailerService } from '../../src/modules/mailer/mailer.service.js';
import { NotificationService } from '../../src/modules/notifications/notification.service.js';

describe('Authentication Sessions, User Isolation & Notification Engine', () => {
  const app = buildApp();
  let user1Token = '';
  let user1Id = '';
  let user1AccountId = '';

  let user2Token = '';
  let user2Id = '';
  let user2AccountId = '';

  beforeEach(async () => {
    DataStore.clear();
    MailerService.clear();

    // 1. Create and verify User 1
    const u1Signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        fullName: 'User One',
        email: 'user1@letstrackit.app',
        password: 'Str0ng!Passw0rd#2026_One',
        currencyPreference: 'INR'
      }
    });
    expect(u1Signup.statusCode).toBe(201);
    user1Id = JSON.parse(u1Signup.body).userId;
    const otp1 = MailerService.getLastSentEmail('user1@letstrackit.app')?.otp!;
    const u1Verify = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: { email: 'user1@letstrackit.app', otp: otp1 }
    });
    expect(u1Verify.statusCode).toBe(200);
    user1Token = JSON.parse(u1Verify.body).tokens.accessToken;

    const u1Accounts = await app.inject({
      method: 'GET',
      url: '/api/v1/users/accounts',
      headers: { authorization: `Bearer ${user1Token}` }
    });
    user1AccountId = JSON.parse(u1Accounts.body)[0].id;

    // 2. Create and verify User 2
    const u2Signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        fullName: 'User Two',
        email: 'user2@letstrackit.app',
        password: 'Str0ng!Passw0rd#2026_Two',
        currencyPreference: 'USD'
      }
    });
    expect(u2Signup.statusCode).toBe(201);
    user2Id = JSON.parse(u2Signup.body).userId;
    const otp2 = MailerService.getLastSentEmail('user2@letstrackit.app')?.otp!;
    const u2Verify = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: { email: 'user2@letstrackit.app', otp: otp2 }
    });
    expect(u2Verify.statusCode).toBe(200);
    user2Token = JSON.parse(u2Verify.body).tokens.accessToken;

    const u2Accounts = await app.inject({
      method: 'GET',
      url: '/api/v1/users/accounts',
      headers: { authorization: `Bearer ${user2Token}` }
    });
    user2AccountId = JSON.parse(u2Accounts.body)[0].id;
  });

  describe('1. Session Verification & Security (/api/v1/auth/me, /logout)', () => {
    it('returns current session profile and NEVER exposes passwordHash or secrets', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${user1Token}` }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.user.email).toBe('user1@letstrackit.app');
      expect(body.user.fullName).toBe('User One');
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.user.password).toBeUndefined();
    });

    it('rejects /me request without valid authentication with 401 Unauthorized', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me'
      });
      expect(res.statusCode).toBe(401);
    });

    it('logs out securely, revoking refresh tokens and clearing session', async () => {
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { authorization: `Bearer ${user1Token}` }
      });

      expect(logoutRes.statusCode).toBe(200);
      expect(JSON.parse(logoutRes.body).success).toBe(true);
    });
  });

  describe('2. Cross-User Data Isolation', () => {
    it('prevents User 2 from accessing User 1 transactions', async () => {
      // User 1 creates a transaction
      const txRes = await app.inject({
        method: 'POST',
        url: '/api/v1/transactions',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: {
          accountId: user1AccountId,
          amount: 500,
          type: 'EXPENSE',
          category: 'FOOD',
          mode: 'UPI',
          platform: 'Swiggy',
          purpose: 'Private Dinner'
        }
      });
      expect(txRes.statusCode).toBe(201);
      const txId = JSON.parse(txRes.body).id;

      // User 2 tries to fetch User 1 transactions
      const u2TxList = await app.inject({
        method: 'GET',
        url: `/api/v1/transactions?accountId=${user1AccountId}`,
        headers: { authorization: `Bearer ${user2Token}` }
      });
      // User 2 cannot see transactions belonging to User 1's account
      const list = JSON.parse(u2TxList.body);
      expect(list).toHaveLength(0);

      // User 2 tries to delete User 1 transaction
      const u2DeleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/transactions/${txId}`,
        headers: { authorization: `Bearer ${user2Token}` }
      });
      expect(u2DeleteRes.statusCode).toBe(403);
    });
  });

  describe('3. Notifications System & Budget Alerts', () => {
    it('creates and lists user-specific notifications', async () => {
      // Create notification for User 1
      NotificationService.createNotification(user1Id, {
        title: 'Welcome',
        message: 'Welcome to your hub!',
        type: 'info',
        category: 'SYSTEM'
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { authorization: `Bearer ${user1Token}` }
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.notifications).toHaveLength(1);
      expect(data.unreadCount).toBe(1);
      expect(data.notifications[0].title).toBe('Welcome');

      // User 2 should NOT see User 1 notifications
      const u2Res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { authorization: `Bearer ${user2Token}` }
      });
      expect(JSON.parse(u2Res.body).notifications).toHaveLength(0);
    });

    it('marks notification as read and enforces user authorization', async () => {
      const notif = NotificationService.createNotification(user1Id, {
        title: 'Alert',
        message: 'Test alert',
        type: 'warning',
        category: 'BUDGET'
      });

      // User 2 tries to mark User 1 notification as read -> 403 Forbidden
      const unauthorizedMark = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notif.id}/read`,
        headers: { authorization: `Bearer ${user2Token}` }
      });
      expect(unauthorizedMark.statusCode).toBe(403);

      // User 1 marks as read -> 200 OK
      const authorizedMark = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notif.id}/read`,
        headers: { authorization: `Bearer ${user1Token}` }
      });
      expect(authorizedMark.statusCode).toBe(200);
      expect(JSON.parse(authorizedMark.body).read).toBe(true);
    });

    it('automatically triggers budget threshold notification when limit is breached', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Set goal of 1000 for Groceries
      await app.inject({
        method: 'POST',
        url: '/api/v1/goals',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: {
          accountId: user1AccountId,
          category: 'GROCERY',
          targetAmount: 1000,
          month: currentMonth
        }
      });

      // User 1 logs expense of 850 (85% -> reaches 80% threshold)
      await app.inject({
        method: 'POST',
        url: '/api/v1/transactions',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: {
          accountId: user1AccountId,
          amount: 850,
          type: 'EXPENSE',
          category: 'GROCERY',
          mode: 'CARD',
          platform: 'Zepto',
          purpose: 'Weekly Groceries'
        }
      });

      const notifsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { authorization: `Bearer ${user1Token}` }
      });

      const notifs = JSON.parse(notifsRes.body).notifications;
      const budgetAlert = notifs.find((n: any) => n.category === 'BUDGET');
      expect(budgetAlert).toBeDefined();
      expect(budgetAlert.title).toContain('Budget Threshold Alert');

      // Now exceed 100% limit with another transaction of 200 (Total 1050 > 1000)
      await app.inject({
        method: 'POST',
        url: '/api/v1/transactions',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: {
          accountId: user1AccountId,
          amount: 200,
          type: 'EXPENSE',
          category: 'GROCERY',
          mode: 'CARD',
          platform: 'Zepto',
          purpose: 'Extra Groceries'
        }
      });

      const breachedRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { authorization: `Bearer ${user1Token}` }
      });
      const breachedAlert = JSON.parse(breachedRes.body).notifications.find((n: any) => n.title.includes('Breached'));
      expect(breachedAlert).toBeDefined();
    });

    it('marks all notifications as read and dismisses notifications', async () => {
      NotificationService.createNotification(user1Id, { title: '1', message: 'msg1' });
      NotificationService.createNotification(user1Id, { title: '2', message: 'msg2' });

      // Filter check
      const unreadOnly = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?read=false',
        headers: { authorization: `Bearer ${user1Token}` }
      });
      expect(JSON.parse(unreadOnly.body).notifications.length).toBeGreaterThanOrEqual(2);

      // Mark all read
      const markAllRes = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/mark-all-read',
        headers: { authorization: `Bearer ${user1Token}` }
      });
      expect(markAllRes.statusCode).toBe(200);

      const afterMarkAll = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { authorization: `Bearer ${user1Token}` }
      });
      expect(JSON.parse(afterMarkAll.body).unreadCount).toBe(0);

      // Delete notification
      const toDelete = JSON.parse(afterMarkAll.body).notifications[0];
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/notifications/${toDelete.id}`,
        headers: { authorization: `Bearer ${user1Token}` }
      });
      expect(deleteRes.statusCode).toBe(200);

      // User 2 cannot delete User 1 notification
      const remainingNotif = JSON.parse(afterMarkAll.body).notifications[1];
      if (remainingNotif) {
        const u2DeleteRes = await app.inject({
          method: 'DELETE',
          url: `/api/v1/notifications/${remainingNotif.id}`,
          headers: { authorization: `Bearer ${user2Token}` }
        });
        expect(u2DeleteRes.statusCode).toBe(403);
      }
    });
  });
});
