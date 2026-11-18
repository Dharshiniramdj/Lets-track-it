import { describe, it, expect, beforeEach } from 'vitest';
import { RagService } from '../../src/modules/ai/rag.service.js';
import { XGBoostService, DataPoint } from '../../src/modules/ml/xgboost.service.js';
import { KMeansService } from '../../src/modules/ml/kmeans.service.js';
import { TransactionService } from '../../src/modules/transactions/transaction.service.js';
import { DataStore, TransactionRecord, SavingsGoalRecord } from '../../src/common/db/data-store.js';

describe('RAG, Machine Learning & Financial Calculations Unit Test Suite', () => {
  const testUserId = 'test-supabase-user-uuid-101';
  const testAccountId = 'test-account-id-101';

  beforeEach(() => {
    DataStore.clear();

    DataStore.accounts.set(testAccountId, {
      id: testAccountId,
      name: 'Personal',
      type: 'PERSONAL',
      color: 'amber',
      ownerId: testUserId,
      members: [{ userId: testUserId, role: 'OWNER' }],
      createdAt: Date.now()
    });
  });

  describe('Section 5: Mathematical Financial Calculations & Formulas', () => {
    it('calculates total expenses correctly: E = sum(e_i)', () => {
      const expenses = [1200.5, 450.25, 300, 1500];
      const total = TransactionService.calculateTotalExpenses(expenses);
      expect(total).toBe(3450.75);
    });

    it('calculates remaining budget correctly: B_r = B_t - E', () => {
      const remaining = TransactionService.calculateRemainingBudget(15000, 9500);
      expect(remaining).toBe(5500);
    });

    it('calculates budget utilization: U = (E / B_t) * 100% and safely handles zero budget', () => {
      const util = TransactionService.calculateBudgetUtilization(8000, 10000);
      expect(util).toBe(80);

      // Handle zero budget gracefully
      const zeroBudget = TransactionService.calculateBudgetUtilization(500, 0);
      expect(zeroBudget).toBe(0);
    });

    it('calculates net savings: S = I - E', () => {
      const savings = TransactionService.calculateSavings(50000, 32000);
      expect(savings).toBe(18000);

      const negativeSavings = TransactionService.calculateSavings(20000, 25000);
      expect(negativeSavings).toBe(-5000);
    });

    it('calculates expense growth: G = ((E_cur - E_prev) / E_prev) * 100% and handles zero prior period', () => {
      // 20% increase
      const growth = TransactionService.calculateExpenseGrowth(12000, 10000);
      expect(growth.isGrowthCalculable).toBe(true);
      expect(growth.growthPercent).toBe(20);

      // 0 prior period expenses
      const noPrior = TransactionService.calculateExpenseGrowth(5000, 0);
      expect(noPrior.isGrowthCalculable).toBe(false);
      expect(noPrior.growthPercent).toBeNull();
      expect(noPrior.message).toContain('No previous period spending');
    });

    it('calculates MAE and RMSE accurately', () => {
      const actuals = [100, 150, 200, 250];
      const preds = [110, 140, 210, 240];

      // Absolute errors: |100-110|=10, |150-140|=10, |200-210|=10, |250-240|=10 => MAE = 10
      const mae = TransactionService.calculateMAE(actuals, preds);
      expect(mae).toBe(10);

      // Squared errors: 100, 100, 100, 100 => avg 100 => sqrt(100) = 10
      const rmse = TransactionService.calculateRMSE(actuals, preds);
      expect(rmse).toBe(10);
    });
  });

  describe('Section 3: Retrieval-Augmented Generation (RAG) Engine', () => {
    it('computes Cosine Similarity formula correctly: sim(q, d) = (q . d) / (||q|| * ||d||)', () => {
      // Orthogonal vectors => 0
      const qOrth = [1, 0];
      const dOrth = [0, 1];
      expect(RagService.cosineSimilarity(qOrth, dOrth)).toBe(0);

      // Identical vectors => 1
      const qSame = [0.6, 0.8];
      const dSame = [0.6, 0.8];
      expect(Math.round(RagService.cosineSimilarity(qSame, dSame) * 100) / 100).toBe(1);

      // Opposite vectors => -1
      const qOpp = [1, 0];
      const dOpp = [-1, 0];
      expect(RagService.cosineSimilarity(qOpp, dOpp)).toBe(-1);
    });

    it('retrieves relevant top-K documents for financial questions', async () => {
      // Seed user transactions & goal
      const currentMonth = new Date().toISOString().slice(0, 7);
      DataStore.transactions.set('tx-1', {
        id: 'tx-1',
        accountId: testAccountId,
        amount: 8500,
        type: 'EXPENSE',
        mode: 'CARD',
        platform: 'Amazon',
        purpose: 'Noise cancelling headphones',
        category: 'ELECTRONICS',
        date: `${currentMonth}-10`,
        createdAt: Date.now()
      });

      DataStore.goals.set('goal-1', {
        id: 'goal-1',
        accountId: testAccountId,
        category: 'ELECTRONICS',
        targetAmount: 10000,
        month: currentMonth,
        createdAt: Date.now()
      });

      const ragResult = await RagService.executeRag(
        testUserId,
        'Why did my Electronics expenses increase this month?'
      );

      expect(ragResult).toBeDefined();
      expect(ragResult.answer).toBeDefined();
      expect(ragResult.retrievedChunks.length).toBeGreaterThan(0);
      expect(ragResult.verifiedMetrics.totalExpense).toBe(8500);
      expect(ragResult.verifiedMetrics.budgetUtilization['ELECTRONICS']).toBe(85);
    });
  });

  describe('Section 4: Machine Learning (XGBoost & K-Means)', () => {
    it('evaluates XGBoost Expense Predictor with chronological train/test holdout', () => {
      const historicalPoints: DataPoint[] = [
        { period: '2026-05', features: [18000, 50000, 4, 1200, 5], label: 20000 },
        { period: '2026-06', features: [20000, 50000, 5, 1100, 6], label: 22000 },
        { period: '2026-07', features: [22000, 52000, 4, 1300, 7], label: 21500 },
        { period: '2026-08', features: [21500, 52000, 6, 1250, 8], label: 23000 },
        { period: '2026-09', features: [23000, 55000, 5, 1400, 9], label: 24500 }
      ];

      const latestFeatures = [24500, 55000, 5, 1400, 10];
      const modelResult = XGBoostService.trainAndPredict(historicalPoints, latestFeatures);

      expect(modelResult.hasSufficientData).toBe(true);
      expect(modelResult.predictedNextMonthExpense).toBeGreaterThan(15000);
      expect(modelResult.evaluation).toBeDefined();
      expect(modelResult.evaluation?.mae).toBeGreaterThanOrEqual(0);
      expect(modelResult.evaluation?.rmse).toBeGreaterThanOrEqual(0);
      expect(modelResult.treesCount).toBeGreaterThan(0);
    });

    it('returns honest data-insufficient message when historical periods < 3 in XGBoost', () => {
      const sparsePoints: DataPoint[] = [
        { period: '2026-09', features: [20000, 50000, 3, 1000, 9], label: 22000 }
      ];

      const result = XGBoostService.trainAndPredict(sparsePoints, [22000, 50000, 3, 1000, 10]);
      expect(result.hasSufficientData).toBe(false);
      expect(result.message).toContain('Insufficient historical months');
      expect(result.baselineEstimate).toBe(22000);
    });

    it('clusters user expenses using K-Means and computes objective J', () => {
      const testExpenses: TransactionRecord[] = [
        { id: '1', accountId: testAccountId, amount: 15000, type: 'EXPENSE', mode: 'CARD', platform: 'Apple', purpose: 'iPad', category: 'ELECTRONICS', date: '2026-10-02', createdAt: 1 },
        { id: '2', accountId: testAccountId, amount: 22000, type: 'EXPENSE', mode: 'CARD', platform: 'Croma', purpose: 'Monitor', category: 'ELECTRONICS', date: '2026-10-05', createdAt: 2 },
        { id: '3', accountId: testAccountId, amount: 80, type: 'EXPENSE', mode: 'UPI', platform: 'Zepto', purpose: 'Milk', category: 'GROCERIES', date: '2026-10-07', createdAt: 3 },
        { id: '4', accountId: testAccountId, amount: 120, type: 'EXPENSE', mode: 'UPI', platform: 'Blinkit', purpose: 'Chips', category: 'GROCERIES', date: '2026-10-08', createdAt: 4 },
        { id: '5', accountId: testAccountId, amount: 95, type: 'EXPENSE', mode: 'UPI', platform: 'Swiggy', purpose: 'Tea', category: 'DINING', date: '2026-10-12', createdAt: 5 },
        { id: '6', accountId: testAccountId, amount: 4500, type: 'EXPENSE', mode: 'NET_BANKING', platform: 'BESCOM', purpose: 'Power bill', category: 'UTILITIES', date: '2026-10-15', createdAt: 6 }
      ];

      const clusterResult = KMeansService.clusterTransactions(testExpenses, 3);
      expect(clusterResult.hasSufficientData).toBe(true);
      expect(clusterResult.clusters.length).toBeGreaterThanOrEqual(2);
      expect(clusterResult.totalWithinClusterDistanceJ).toBeGreaterThanOrEqual(0);

      const clusterNames = clusterResult.clusters.map(c => c.name);
      expect(clusterNames.some(n => n.includes('Major') || n.includes('Micro') || n.includes('Essential'))).toBe(true);
    });

    it('returns honest message when transactions < 5 in K-Means', () => {
      const fewExpenses: TransactionRecord[] = [
        { id: '1', accountId: testAccountId, amount: 500, type: 'EXPENSE', mode: 'UPI', platform: 'Store', purpose: 'Provisions', category: 'GROCERIES', date: '2026-10-02', createdAt: 1 }
      ];

      const result = KMeansService.clusterTransactions(fewExpenses);
      expect(result.hasSufficientData).toBe(false);
      expect(result.message).toContain('Insufficient transaction history');
    });
  });
});
