import crypto from 'node:crypto';
import { DataStore, TransactionRecord, ShoppingDetailsRecord } from '../../common/db/data-store.js';
import { ApiError } from '../../common/errors/api-error.js';
import { TransactionRepository } from './transaction.repo.js';

export interface CreateTransactionDto {
  accountId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  mode: 'UPI' | 'CASH' | 'CARD' | 'NET_BANKING' | 'OTHER';
  platform: string;
  purpose: string;
  category: string;
  date?: string;
  shoppingDetails?: {
    appName: string;
    productName: string;
    forWhom?: string;
    orderedDate?: string;
    deliveryDate?: string;
    status?: 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED';
    subItems?: Array<{ name: string; qty: number; price: number }>;
  };
}

export interface TransactionFilterDto {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  isShoppingOnly?: boolean;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  shoppingSpends: number;
  activeDeliveriesCount: number;
  categoryBreakdown: Record<string, number>;
  dailyAverageExpense: number;
}

export class TransactionService {
  /**
   * Financial Math: Rounds currency values strictly to 2 decimal places with half-up rounding
   */
  public static roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Financial Math: Calculates daily recommended allowance pace
   */
  public static calculateDailyAllowance(budgetRemaining: number, daysRemaining: number): number {
    if (daysRemaining <= 0) return 0;
    if (budgetRemaining <= 0) return 0;
    return this.roundCurrency(budgetRemaining / daysRemaining);
  }

  /**
   * Total Expenses: E = \sum e_i
   */
  public static calculateTotalExpenses(expenses: number[]): number {
    const sum = expenses.reduce((acc, curr) => acc + curr, 0);
    return this.roundCurrency(sum);
  }

  /**
   * Remaining Budget: B_r = B_t - E
   */
  public static calculateRemainingBudget(totalBudget: number, totalExpenses: number): number {
    return this.roundCurrency(totalBudget - totalExpenses);
  }

  /**
   * Budget Utilization: U = (E / B_t) * 100%
   * Safely handles B_t <= 0
   */
  public static calculateBudgetUtilization(totalExpenses: number, totalBudget: number): number {
    if (totalBudget <= 0) return 0;
    return this.roundCurrency((totalExpenses / totalBudget) * 100);
  }

  /**
   * Savings: S = I - E
   */
  public static calculateSavings(income: number, expenses: number): number {
    return this.roundCurrency(income - expenses);
  }

  /**
   * Expense Growth: G = ((E_current - E_previous) / E_previous) * 100%
   */
  public static calculateExpenseGrowth(
    currentExpenses: number,
    previousExpenses: number
  ): { growthPercent: number | null; isGrowthCalculable: boolean; message: string } {
    if (previousExpenses <= 0) {
      return {
        growthPercent: null,
        isGrowthCalculable: false,
        message: 'No previous period spending recorded to calculate growth rate.'
      };
    }
    const growth = ((currentExpenses - previousExpenses) / previousExpenses) * 100;
    return {
      growthPercent: this.roundCurrency(growth),
      isGrowthCalculable: true,
      message: `${this.roundCurrency(growth)}% vs previous period`
    };
  }

  /**
   * Mean Absolute Error: MAE = (1/n) * \sum |y_i - \hat{y}_i|
   */
  public static calculateMAE(actuals: number[], predictions: number[]): number {
    if (actuals.length === 0 || actuals.length !== predictions.length) return 0;
    const sum = actuals.reduce((acc, y, i) => acc + Math.abs(y - predictions[i]), 0);
    return this.roundCurrency(sum / actuals.length);
  }

  /**
   * Root Mean Squared Error: RMSE = \sqrt{ (1/n) * \sum (y_i - \hat{y}_i)^2 }
   */
  public static calculateRMSE(actuals: number[], predictions: number[]): number {
    if (actuals.length === 0 || actuals.length !== predictions.length) return 0;
    const sumSquared = actuals.reduce((acc, y, i) => acc + Math.pow(y - predictions[i], 2), 0);
    return this.roundCurrency(Math.sqrt(sumSquared / actuals.length));
  }

  /**
   * Creates a transaction with optional Shopping Logistics details and idempotency check
   */
  public static createTransaction(
    userId: string,
    dto: CreateTransactionDto,
    idempotencyKey?: string
  ): TransactionRecord {
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
    if (!account) {
      throw ApiError.notFound('Account not found');
    }

    const hasAccess = account.ownerId === userId || account.members.some(m => m.userId === userId);
    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to post transactions to this account');
    }

    if (dto.amount <= 0) {
      throw ApiError.unprocessableEntity('Transaction amount must be greater than zero', [
        { field: 'amount', message: 'Amount must be positive' }
      ]);
    }

    const transactionId = crypto.randomUUID();
    const roundedAmount = this.roundCurrency(dto.amount);
    const txDate = dto.date || new Date().toISOString();

    let shoppingDetails: ShoppingDetailsRecord | undefined;
    if (dto.shoppingDetails) {
      shoppingDetails = {
        appName: dto.shoppingDetails.appName.trim(),
        productName: dto.shoppingDetails.productName.trim(),
        forWhom: dto.shoppingDetails.forWhom?.trim(),
        orderedDate: dto.shoppingDetails.orderedDate || txDate,
        deliveryDate: dto.shoppingDetails.deliveryDate,
        status: dto.shoppingDetails.status || 'ORDERED',
        subItems: dto.shoppingDetails.subItems || []
      };
    }

    const record: TransactionRecord = {
      id: transactionId,
      accountId: dto.accountId,
      amount: roundedAmount,
      type: dto.type,
      mode: dto.mode,
      platform: dto.platform.trim(),
      purpose: dto.purpose.trim(),
      category: dto.category.toUpperCase().trim(),
      date: txDate,
      idempotencyKey,
      shoppingDetails,
      createdAt: Date.now()
    };

    DataStore.transactions.set(transactionId, record);
    // Persist to XAMPP MySQL
    TransactionRepository.save(userId, record).catch(err => {
      console.warn('MySQL transaction save error:', err);
    });
    return record;
  }

  /**
   * Retrieves transactions with comprehensive filtering
   */
  public static getTransactions(userId: string, filters: TransactionFilterDto): TransactionRecord[] {
    const userAccountIds = Array.from(DataStore.accounts.values())
      .filter(acc => acc.ownerId === userId || acc.members.some(m => m.userId === userId))
      .map(acc => acc.id);

    return Array.from(DataStore.transactions.values())
      .filter(tx => {
        if (!userAccountIds.includes(tx.accountId)) return false;
        if (filters.accountId && tx.accountId !== filters.accountId) return false;
        if (filters.category && tx.category.toUpperCase() !== filters.category.toUpperCase()) return false;
        if (filters.type && tx.type !== filters.type) return false;
        if (filters.isShoppingOnly && !tx.shoppingDetails) return false;
        if (filters.startDate && new Date(tx.date) < new Date(filters.startDate)) return false;
        if (filters.endDate && new Date(tx.date) > new Date(filters.endDate)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Updates delivery status for shopping logistics mode
   */
  public static updateDeliveryStatus(
    userId: string,
    transactionId: string,
    status: 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED',
    deliveryDate?: string
  ): TransactionRecord {
    const tx = DataStore.transactions.get(transactionId);
    if (!tx || !tx.shoppingDetails) {
      throw ApiError.notFound('Shopping transaction not found');
    }

    const account = DataStore.accounts.get(tx.accountId);
    if (!account || (account.ownerId !== userId && !account.members.some(m => m.userId === userId))) {
      throw ApiError.forbidden('Forbidden');
    }

    tx.shoppingDetails.status = status;
    if (deliveryDate) {
      tx.shoppingDetails.deliveryDate = deliveryDate;
    }

    DataStore.transactions.set(tx.id, tx);
    return tx;
  }

  /**
   * Deletes a transaction
   */
  public static deleteTransaction(userId: string, transactionId: string): boolean {
    const tx = DataStore.transactions.get(transactionId);
    if (!tx) throw ApiError.notFound('Transaction not found');

    const account = DataStore.accounts.get(tx.accountId);
    if (!account || (account.ownerId !== userId && !account.members.some(m => m.userId === userId))) {
      throw ApiError.forbidden('Forbidden');
    }

    DataStore.transactions.delete(transactionId);
    // Delete from XAMPP MySQL
    TransactionRepository.delete(userId, transactionId).catch(err => {
      console.warn('MySQL transaction delete error:', err);
    });
    return true;
  }

  /**
   * Computes mathematical financial aggregations for a specified month
   */
  public static getFinancialSummary(userId: string, accountId?: string, month?: string): FinancialSummary {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const transactions = this.getTransactions(userId, { accountId }).filter(tx =>
      tx.date.startsWith(targetMonth)
    );

    let totalIncome = 0;
    let totalExpense = 0;
    let shoppingSpends = 0;
    let activeDeliveriesCount = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        totalIncome += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;
        categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;

        if (tx.shoppingDetails) {
          shoppingSpends += tx.amount;
          if (tx.shoppingDetails.status === 'ORDERED' || tx.shoppingDetails.status === 'SHIPPED') {
            activeDeliveriesCount += 1;
          }
        }
      }
    }

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const passedDays = Math.max(1, now.getDate());
    const dailyAverageExpense = this.roundCurrency(totalExpense / passedDays);

    return {
      totalIncome: this.roundCurrency(totalIncome),
      totalExpense: this.roundCurrency(totalExpense),
      netBalance: this.roundCurrency(totalIncome - totalExpense),
      shoppingSpends: this.roundCurrency(shoppingSpends),
      activeDeliveriesCount,
      categoryBreakdown,
      dailyAverageExpense
    };
  }
}
