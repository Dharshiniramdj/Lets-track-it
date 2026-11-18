import { describe, it, expect } from 'vitest';
import { TransactionService } from '../../src/modules/transactions/transaction.service.js';

describe('Financial Math & Utilities Verification', () => {
  describe('Currency Rounding', () => {
    it('rounds standard values correctly to 2 decimal places', () => {
      expect(TransactionService.roundCurrency(10.555)).toBe(10.56);
      expect(TransactionService.roundCurrency(10.554)).toBe(10.55);
      expect(TransactionService.roundCurrency(0.1 + 0.2)).toBe(0.3);
      expect(TransactionService.roundCurrency(1250)).toBe(1250);
    });

    it('handles precision rounding for sub-paisa or sub-cent amounts', () => {
      expect(TransactionService.roundCurrency(99.999)).toBe(100);
      expect(TransactionService.roundCurrency(0.004)).toBe(0);
      expect(TransactionService.roundCurrency(0.005)).toBe(0.01);
    });
  });

  describe('Daily Allowance Calculator', () => {
    it('calculates daily recommended pace correctly given remaining buffer and days', () => {
      // e.g. 3000 buffer remaining over 10 days => 300/day
      const pace = TransactionService.calculateDailyAllowance(3000, 10);
      expect(pace).toBe(300);
    });

    it('returns 0 when remaining days is zero or negative', () => {
      expect(TransactionService.calculateDailyAllowance(1000, 0)).toBe(0);
      expect(TransactionService.calculateDailyAllowance(1000, -2)).toBe(0);
    });

    it('returns 0 when budget buffer has been exhausted', () => {
      expect(TransactionService.calculateDailyAllowance(0, 15)).toBe(0);
      expect(TransactionService.calculateDailyAllowance(-500, 15)).toBe(0);
    });

    it('rounds daily allowance to two decimal places', () => {
      const pace = TransactionService.calculateDailyAllowance(1000, 3);
      expect(pace).toBe(333.33);
    });
  });
});
