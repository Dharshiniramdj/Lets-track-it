import crypto from 'node:crypto';
import { DataStore, SavingsGoalRecord } from '../../common/db/data-store.js';
import { ApiError } from '../../common/errors/api-error.js';
import { TransactionService } from '../transactions/transaction.service.js';
import { BudgetRepository } from './budget.repo.js';

export interface CreateGoalDto {
  accountId: string;
  category: string;
  targetAmount: number;
  month?: string; // YYYY-MM
  notes?: string;
}

export interface GoalProgressMetric {
  id: string;
  accountId: string;
  category: string;
  targetAmount: number;
  actualSpent: number;
  remainingBuffer: number;
  percentageConsumed: number;
  dailyRecommendedPace: number;
  status: 'SAFE' | 'WARNING' | 'EXCEEDED';
  colorCode: 'GREEN' | 'AMBER' | 'RED';
  month: string;
  notes?: string;
}

export class GoalService {
  /**
   * Sets or updates a monthly category budget goal
   */
  public static createOrUpdateGoal(userId: string, dto: CreateGoalDto): SavingsGoalRecord {
    let account = DataStore.accounts.get(dto.accountId);
    if (!account && (dto.accountId === 'default' || !dto.accountId)) {
      account = {
        id: dto.accountId || 'default',
        name: 'Personal',
        type: 'PERSONAL',
        color: 'amber',
        ownerId: userId,
        members: [{ userId, role: 'OWNER' }],
        createdAt: Date.now()
      };
      DataStore.accounts.set(account.id, account);
    }
    if (!account) throw ApiError.notFound('Account not found');

    const hasAccess = account.ownerId === userId || account.members.some(m => m.userId === userId);
    if (!hasAccess) throw ApiError.forbidden('Forbidden');

    if (dto.targetAmount <= 0) {
      throw ApiError.unprocessableEntity('Goal target amount must be greater than zero', [
        { field: 'targetAmount', message: 'Target amount must be positive' }
      ]);
    }

    const targetMonth = dto.month || new Date().toISOString().slice(0, 7);
    const categoryNorm = dto.category.trim().toUpperCase();

    // Check for existing goal in this month/category
    const existing = Array.from(DataStore.goals.values()).find(
      g => g.accountId === dto.accountId && g.category.toUpperCase() === categoryNorm && g.month === targetMonth
    );

    if (existing) {
      existing.targetAmount = TransactionService.roundCurrency(dto.targetAmount);
      existing.notes = dto.notes;
      DataStore.goals.set(existing.id, existing);
      BudgetRepository.save(userId, existing).catch(err => {
        console.warn('MySQL budget save error:', err);
      });
      return existing;
    }

    const goalId = crypto.randomUUID();
    const record: SavingsGoalRecord = {
      id: goalId,
      accountId: dto.accountId,
      category: categoryNorm,
      targetAmount: TransactionService.roundCurrency(dto.targetAmount),
      month: targetMonth,
      notes: dto.notes,
      createdAt: Date.now()
    };

    DataStore.goals.set(goalId, record);
    BudgetRepository.save(userId, record).catch(err => {
      console.warn('MySQL budget save error:', err);
    });
    return record;
  }

  /**
   * Computes live progress metrics for all goals linked to an account
   */
  public static getGoalsWithProgress(userId: string, accountId: string, month?: string): GoalProgressMetric[] {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const goals = Array.from(DataStore.goals.values()).filter(
      g => g.accountId === accountId && g.month === targetMonth
    );

    const now = new Date();
    const currentYear = parseInt(targetMonth.split('-')[0], 10);
    const currentMonthNum = parseInt(targetMonth.split('-')[1], 10);
    const totalDaysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
    const currentDay = Math.min(now.getDate(), totalDaysInMonth);
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay);

    // Get current month transactions for the account
    const txList = Array.from(DataStore.transactions.values()).filter(
      t => t.accountId === accountId && t.type === 'EXPENSE' && t.date.startsWith(targetMonth)
    );

    return goals.map(goal => {
      const goalCat = goal.category.toUpperCase();

      // Find matching expenses
      const spent = txList
        .filter(t => {
          const tCat = t.category.toUpperCase();
          const tPurp = t.purpose.toUpperCase();
          if (goalCat === 'GROCERY' || goalCat === 'GROCERIES') {
            return tCat === 'GROCERY' || tPurp.includes('BLINKIT') || tPurp.includes('ZEPTO') || tPurp.includes('INSTAMART');
          }
          if (goalCat === 'ELECTRONICS') {
            return tCat === 'ELECTRONICS' || tPurp.includes('LAPTOP') || tPurp.includes('PHONE');
          }
          if (goalCat === 'DINING' || goalCat === 'FOOD') {
            return tCat === 'DINING' || tCat === 'FOOD' || tPurp.includes('DINING') || tPurp.includes('SWIGGY') || tPurp.includes('ZOMATO');
          }
          if (goalCat === 'SHOPPING') {
            return tCat === 'SHOPPING' || tPurp.includes('AMAZON') || tPurp.includes('FLIPKART') || tPurp.includes('MYNTRA');
          }
          return tCat === goalCat || tPurp.includes(goalCat);
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const actualSpent = TransactionService.roundCurrency(spent);
      const remainingBuffer = TransactionService.roundCurrency(goal.targetAmount - actualSpent);
      const percentageConsumed = goal.targetAmount > 0
        ? Math.round((actualSpent / goal.targetAmount) * 100)
        : 0;

      let status: 'SAFE' | 'WARNING' | 'EXCEEDED' = 'SAFE';
      let colorCode: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';

      if (percentageConsumed >= 100) {
        status = 'EXCEEDED';
        colorCode = 'RED';
      } else if (percentageConsumed >= 70) {
        status = 'WARNING';
        colorCode = 'AMBER';
      } else {
        status = 'SAFE';
        colorCode = 'GREEN';
      }

      const dailyRecommendedPace = TransactionService.calculateDailyAllowance(
        remainingBuffer,
        daysRemaining
      );

      return {
        id: goal.id,
        accountId: goal.accountId,
        category: goal.category,
        targetAmount: goal.targetAmount,
        actualSpent,
        remainingBuffer,
        percentageConsumed,
        dailyRecommendedPace,
        status,
        colorCode,
        month: goal.month,
        notes: goal.notes
      };
    });
  }

  public static deleteGoal(userId: string, goalId: string): boolean {
    const goal = DataStore.goals.get(goalId);
    if (!goal) throw ApiError.notFound('Goal not found');

    const account = DataStore.accounts.get(goal.accountId);
    if (!account || (account.ownerId !== userId && !account.members.some(m => m.userId === userId))) {
      throw ApiError.forbidden('Forbidden');
    }

    DataStore.goals.delete(goalId);
    BudgetRepository.delete(userId, goalId).catch(err => {
      console.warn('MySQL budget delete error:', err);
    });
    return true;
  }
}
