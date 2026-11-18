import { describe, it, expect, beforeEach } from 'vitest';
import { GoalService } from '../../src/modules/goals/goal.service.js';
import { TransactionService } from '../../src/modules/transactions/transaction.service.js';
import { DataStore, AccountRecord } from '../../src/common/db/data-store.js';

describe('Category Savings Goals & Pacing Unit Tests', () => {
  const userId = 'user-goal-1';
  const accountId = 'acc-goal-1';
  const currentMonth = new Date().toISOString().slice(0, 7);

  beforeEach(() => {
    DataStore.clear();

    const account: AccountRecord = {
      id: accountId,
      name: 'Main Checking',
      type: 'PERSONAL',
      color: '#6366f1',
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
      createdAt: Date.now()
    };
    DataStore.accounts.set(accountId, account);
  });

  it('creates a category goal and reports SAFE status (<70% consumed)', () => {
    GoalService.createOrUpdateGoal(userId, {
      accountId,
      category: 'GROCERY',
      targetAmount: 10000,
      month: currentMonth
    });

    // Add expense of 3000 (30%)
    TransactionService.createTransaction(userId, {
      accountId,
      amount: 3000,
      type: 'EXPENSE',
      mode: 'UPI',
      platform: 'Supermarket',
      purpose: 'Monthly provisions',
      category: 'GROCERY'
    });

    const metrics = GoalService.getGoalsWithProgress(userId, accountId, currentMonth);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].actualSpent).toBe(3000);
    expect(metrics[0].remainingBuffer).toBe(7000);
    expect(metrics[0].percentageConsumed).toBe(30);
    expect(metrics[0].status).toBe('SAFE');
    expect(metrics[0].colorCode).toBe('GREEN');
  });

  it('triggers WARNING (AMBER) when spending reaches 70% to 95%', () => {
    GoalService.createOrUpdateGoal(userId, {
      accountId,
      category: 'DINING',
      targetAmount: 5000,
      month: currentMonth
    });

    // Add expense of 4000 (80%)
    TransactionService.createTransaction(userId, {
      accountId,
      amount: 4000,
      type: 'EXPENSE',
      mode: 'CARD',
      platform: 'Restaurant',
      purpose: 'Team Dinner',
      category: 'DINING'
    });

    const metrics = GoalService.getGoalsWithProgress(userId, accountId, currentMonth);
    expect(metrics[0].percentageConsumed).toBe(80);
    expect(metrics[0].status).toBe('WARNING');
    expect(metrics[0].colorCode).toBe('AMBER');
  });

  it('triggers EXCEEDED (RED) when limit is breached (>= 100%)', () => {
    GoalService.createOrUpdateGoal(userId, {
      accountId,
      category: 'ELECTRONICS',
      targetAmount: 20000,
      month: currentMonth
    });

    // Add expense of 22000 (110%)
    TransactionService.createTransaction(userId, {
      accountId,
      amount: 22000,
      type: 'EXPENSE',
      mode: 'CARD',
      platform: 'Electronics Store',
      purpose: 'New Monitor',
      category: 'ELECTRONICS'
    });

    const metrics = GoalService.getGoalsWithProgress(userId, accountId, currentMonth);
    expect(metrics[0].percentageConsumed).toBe(110);
    expect(metrics[0].remainingBuffer).toBe(-2000);
    expect(metrics[0].status).toBe('EXCEEDED');
    expect(metrics[0].colorCode).toBe('RED');
  });
});
