import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionService } from '../../src/modules/transactions/transaction.service.js';
import { DataStore, AccountRecord } from '../../src/common/db/data-store.js';

describe('TransactionService Unit & Domain Logic Tests', () => {
  const userId = 'user-tx-test';
  const otherUserId = 'user-stranger';
  const accountId = 'acc-tx-1';

  beforeEach(() => {
    DataStore.clear();

    const account: AccountRecord = {
      id: accountId,
      name: 'Personal Checking',
      type: 'PERSONAL',
      color: '#6366f1',
      ownerId: userId,
      members: [{ userId, role: 'OWNER' }],
      createdAt: Date.now()
    };
    DataStore.accounts.set(accountId, account);
  });

  it('creates an income transaction successfully', () => {
    const tx = TransactionService.createTransaction(userId, {
      accountId,
      amount: 50000,
      type: 'INCOME',
      mode: 'NET_BANKING',
      platform: 'Employer Payroll',
      purpose: 'Monthly Salary',
      category: 'INCOME'
    });

    expect(tx.id).toBeDefined();
    expect(tx.amount).toBe(50000);
    expect(tx.type).toBe('INCOME');
  });

  it('rejects transaction when amount is zero or negative', () => {
    expect(() => {
      TransactionService.createTransaction(userId, {
        accountId,
        amount: -100,
        type: 'EXPENSE',
        mode: 'CASH',
        platform: 'Offline',
        purpose: 'Test',
        category: 'OTHERS'
      });
    }).toThrow('Transaction amount must be greater than zero');
  });

  it('rejects transaction when user does not have account access', () => {
    expect(() => {
      TransactionService.createTransaction(otherUserId, {
        accountId,
        amount: 500,
        type: 'EXPENSE',
        mode: 'UPI',
        platform: 'Offline',
        purpose: 'Unauthorized',
        category: 'OTHERS'
      });
    }).toThrow('You do not have access to post transactions');
  });

  it('creates a Shopping Logistics transaction with delivery lifecycle and subItems', () => {
    const tx = TransactionService.createTransaction(userId, {
      accountId,
      amount: 3499.5,
      type: 'EXPENSE',
      mode: 'CARD',
      platform: 'Amazon',
      purpose: 'Mechanical Keyboard & Mouse',
      category: 'ELECTRONICS',
      shoppingDetails: {
        appName: 'Amazon',
        productName: 'Keychron K2 Keyboard',
        forWhom: 'Self',
        orderedDate: '2026-10-11T10:00:00Z',
        deliveryDate: '2026-10-14T18:00:00Z',
        status: 'ORDERED',
        subItems: [
          { name: 'Keychron K2 Wireless Keyboard', qty: 1, price: 2999 },
          { name: 'Wrist Rest Cushion', qty: 1, price: 500.5 }
        ]
      }
    });

    expect(tx.shoppingDetails).toBeDefined();
    expect(tx.shoppingDetails?.status).toBe('ORDERED');
    expect(tx.shoppingDetails?.subItems).toHaveLength(2);

    // Update status to SHIPPED and DELIVERED
    const updated = TransactionService.updateDeliveryStatus(userId, tx.id, 'SHIPPED');
    expect(updated.shoppingDetails?.status).toBe('SHIPPED');

    const delivered = TransactionService.updateDeliveryStatus(userId, tx.id, 'DELIVERED', '2026-10-13T12:00:00Z');
    expect(delivered.shoppingDetails?.status).toBe('DELIVERED');
    expect(delivered.shoppingDetails?.deliveryDate).toBe('2026-10-13T12:00:00Z');
  });

  it('filters transactions by category, type, and shopping flag', () => {
    TransactionService.createTransaction(userId, {
      accountId,
      amount: 1500,
      type: 'EXPENSE',
      mode: 'UPI',
      platform: 'Blinkit',
      purpose: 'Fruits & Veggies',
      category: 'GROCERY'
    });

    TransactionService.createTransaction(userId, {
      accountId,
      amount: 600,
      type: 'EXPENSE',
      mode: 'UPI',
      platform: 'Zepto',
      purpose: 'Snacks',
      category: 'GROCERY',
      shoppingDetails: {
        appName: 'Zepto',
        productName: 'Chips & Cold Drink',
        status: 'ORDERED'
      }
    });

    const allTx = TransactionService.getTransactions(userId, { accountId });
    expect(allTx).toHaveLength(2);

    const shoppingOnly = TransactionService.getTransactions(userId, { accountId, isShoppingOnly: true });
    expect(shoppingOnly).toHaveLength(1);
    expect(shoppingOnly[0].shoppingDetails?.appName).toBe('Zepto');

    const groceryOnly = TransactionService.getTransactions(userId, { category: 'GROCERY' });
    expect(groceryOnly).toHaveLength(2);
  });

  it('calculates financial summary aggregations accurately', () => {
    TransactionService.createTransaction(userId, {
      accountId,
      amount: 40000,
      type: 'INCOME',
      mode: 'NET_BANKING',
      platform: 'Salary',
      purpose: 'October Salary',
      category: 'INCOME'
    });

    TransactionService.createTransaction(userId, {
      accountId,
      amount: 5000,
      type: 'EXPENSE',
      mode: 'UPI',
      platform: 'Zepto',
      purpose: 'Groceries',
      category: 'GROCERY',
      shoppingDetails: {
        appName: 'Zepto',
        productName: 'Vegetables',
        status: 'ORDERED'
      }
    });

    const summary = TransactionService.getFinancialSummary(userId, accountId);
    expect(summary.totalIncome).toBe(40000);
    expect(summary.totalExpense).toBe(5000);
    expect(summary.netBalance).toBe(35000);
    expect(summary.shoppingSpends).toBe(5000);
    expect(summary.activeDeliveriesCount).toBe(1);
    expect(summary.categoryBreakdown['GROCERY']).toBe(5000);
    expect(summary.dailyAverageExpense).toBeGreaterThan(0);
  });

  it('deletes transactions properly', () => {
    const tx = TransactionService.createTransaction(userId, {
      accountId,
      amount: 200,
      type: 'EXPENSE',
      mode: 'CASH',
      platform: 'Tea Stall',
      purpose: 'Evening Tea',
      category: 'FOOD'
    });

    expect(DataStore.transactions.has(tx.id)).toBe(true);
    TransactionService.deleteTransaction(userId, tx.id);
    expect(DataStore.transactions.has(tx.id)).toBe(false);
  });
});
