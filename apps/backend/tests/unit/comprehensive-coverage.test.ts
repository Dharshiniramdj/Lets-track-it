import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { GoalService } from '../../src/modules/goals/goal.service.js';
import { UserService } from '../../src/modules/users/user.service.js';
import { GeminiService } from '../../src/modules/ai/gemini.service.js';
import { AuthGuard } from '../../src/common/guards/auth.guard.js';
import { DataStore, AccountRecord, UserRecord } from '../../src/common/db/data-store.js';
import { MailerService } from '../../src/modules/mailer/mailer.service.js';
import { DistributedRateLimiter } from '../../src/common/rate-limiter/rate-limiter.service.js';

describe('Comprehensive Domain Services 90%+ Coverage Tests', () => {
  const userId = 'user-comp-1';
  const accountId = 'acc-comp-1';

  beforeEach(() => {
    DataStore.clear();
    MailerService.clear();
    DistributedRateLimiter.clear();

    const user: UserRecord = {
      id: userId,
      email: 'comp@example.com',
      fullName: 'Coverage User',
      passwordHash: 'hash',
      currencyPreference: 'INR',
      status: 'ACTIVE',
      createdAt: Date.now()
    };
    DataStore.users.set(userId, user);

    const account: AccountRecord = {
      id: accountId,
      name: 'Comp Account',
      type: 'PERSONAL',
      color: '#6366f1',
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
      createdAt: Date.now()
    };
    DataStore.accounts.set(accountId, account);
  });

  it('registers and logs in via biometrics', async () => {
    await AuthService.registerBiometrics(userId, 'mock-public-key-hex-abc');
    const user = DataStore.users.get(userId);
    expect(user?.biometricPublicKey).toBe('mock-public-key-hex-abc');

    const loginRes = await AuthService.biometricLogin({
      userId,
      signature: 'valid-sig-123',
      challenge: 'random-challenge'
    });
    expect(loginRes.tokens.accessToken).toBeDefined();
  });

  it('deletes savings goals and prevents unauthorized deletion', () => {
    const goal = GoalService.createOrUpdateGoal(userId, {
      accountId,
      category: 'BILLS',
      targetAmount: 5000
    });

    expect(DataStore.goals.has(goal.id)).toBe(true);

    // Stranger cannot delete
    expect(() => {
      GoalService.deleteGoal('stranger-user', goal.id);
    }).toThrow('Forbidden');

    // Owner deletes
    GoalService.deleteGoal(userId, goal.id);
    expect(DataStore.goals.has(goal.id)).toBe(false);
  });

  it('throws error when creating goal with non-positive amount or invalid account', () => {
    expect(() => {
      GoalService.createOrUpdateGoal(userId, {
        accountId: 'non-existent',
        category: 'TRAVEL',
        targetAmount: 1000
      });
    }).toThrow('Account not found');

    expect(() => {
      GoalService.createOrUpdateGoal(userId, {
        accountId,
        category: 'TRAVEL',
        targetAmount: -50
      });
    }).toThrow('Goal target amount must be greater than zero');
  });

  it('updates an existing goal if month and category match', () => {
    const initial = GoalService.createOrUpdateGoal(userId, {
      accountId,
      category: 'ENTERTAINMENT',
      targetAmount: 3000
    });
    expect(initial.targetAmount).toBe(3000);

    const updated = GoalService.createOrUpdateGoal(userId, {
      accountId,
      category: 'ENTERTAINMENT',
      targetAmount: 4500,
      notes: 'Increased for movie weekend'
    });
    expect(updated.targetAmount).toBe(4500);
    expect(updated.id).toBe(initial.id);
  });

  it('handles user service edge cases: non-owner invites, self-removal, unknown user, duplicate member', () => {
    const strangerId = 'stranger-id';
    expect(() => {
      UserService.addAccountMember(strangerId, accountId, {
        email: 'nobody@example.com',
        role: 'MEMBER'
      });
    }).toThrow('Only the account owner can invite members');

    expect(() => {
      UserService.addAccountMember(userId, accountId, {
        email: 'nonexistent@example.com',
        role: 'MEMBER'
      });
    }).toThrow('No user found with email nonexistent@example.com');

    // Add member once
    const friend: UserRecord = {
      id: 'friend-1',
      email: 'friend@example.com',
      fullName: 'Friend',
      passwordHash: 'hash',
      currencyPreference: 'INR',
      status: 'ACTIVE',
      createdAt: Date.now()
    };
    DataStore.users.set('friend-1', friend);

    UserService.addAccountMember(userId, accountId, { email: 'friend@example.com', role: 'MEMBER' });

    // Duplicate invite
    expect(() => {
      UserService.addAccountMember(userId, accountId, { email: 'friend@example.com', role: 'MEMBER' });
    }).toThrow('User is already a member of this account');

    expect(() => {
      UserService.removeAccountMember('stranger-user', accountId, friend.id);
    }).toThrow('Only the account owner can remove members');

    expect(() => {
      UserService.removeAccountMember(userId, accountId, userId);
    }).toThrow('Cannot remove the account owner');
  });

  it('matches SHOPPING category in goal progress calculations', () => {
    GoalService.createOrUpdateGoal(userId, {
      accountId,
      category: 'SHOPPING',
      targetAmount: 8000
    });

    const tx = DataStore.transactions.set('tx-shop-1', {
      id: 'tx-shop-1',
      accountId,
      amount: 4000,
      type: 'EXPENSE',
      mode: 'CARD',
      platform: 'Amazon',
      purpose: 'Shoes from Amazon',
      category: 'SHOPPING',
      date: new Date().toISOString(),
      createdAt: Date.now()
    });

    const metrics = GoalService.getGoalsWithProgress(userId, accountId);
    const shopGoal = metrics.find(m => m.category === 'SHOPPING');
    expect(shopGoal?.actualSpent).toBe(4000);
    expect(shopGoal?.percentageConsumed).toBe(50);
  });

  it('covers all AI advisor role executions: AUDITOR, PLANNER, and GUARD', async () => {
    const auditorRes = await GeminiService.chat(userId, {
      role: 'AUDITOR',
      messages: [{ role: 'user', content: 'Audit my spending rate' }],
      accountId
    });
    expect(auditorRes.role).toBe('AUDITOR');
    expect(auditorRes.model).toBe('gemini-3.1-flash-lite');

    const plannerRes = await GeminiService.chat(userId, {
      role: 'PLANNER',
      messages: [{ role: 'user', content: 'What is my 6 month plan?' }],
      accountId
    });
    expect(plannerRes.role).toBe('PLANNER');
    expect(plannerRes.model).toBe('gemini-3.1-pro-preview');

    const guardRes = await GeminiService.chat(userId, {
      role: 'GUARD',
      messages: [{ role: 'user', content: 'Can I buy a new phone today?' }],
      accountId
    });
    expect(guardRes.role).toBe('GUARD');
    expect(guardRes.model).toBe('gemini-3.5-flash');
  });

  it('handles AuthGuard missing header and empty token validation', async () => {
    const mockReqMissing = { headers: {} } as any;
    const mockReply = {} as any;

    await expect(AuthGuard.authenticate(mockReqMissing, mockReply)).rejects.toThrow(
      'Authorization header with Bearer token is required'
    );

    const mockReqEmpty = { headers: { authorization: 'Bearer   ' } } as any;
    await expect(AuthGuard.authenticate(mockReqEmpty, mockReply)).rejects.toThrow(
      'Bearer token cannot be empty'
    );
  });
});
