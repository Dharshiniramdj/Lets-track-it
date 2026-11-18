import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Transaction, SavingsGoal, Account, TransactionType, PaymentMode, Category } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SyncState {
  isSyncing: boolean;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: Date | null;
  errorMessage?: string;
  isRealtimeConnected: boolean;
}

export class DataSyncService {
  private static realtimeChannel: RealtimeChannel | null = null;
  private static activeUserId: string | null = null;

  // -- Data Mappers --

  public static mapRowToTransaction(row: any): Transaction {
    return {
      id: String(row.id),
      accountId: row.account_id || 'default',
      date: row.date ? (typeof row.date === 'string' ? row.date.split('T')[0] : row.date) : new Date().toISOString().split('T')[0],
      amount: Number(row.amount) || 0,
      type: row.type as TransactionType,
      mode: row.mode as PaymentMode,
      platform: row.platform || '',
      purpose: row.purpose || '',
      category: row.category as Category,
      shoppingDetails: row.shopping_details || undefined,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  public static mapTransactionToRow(tx: Transaction, userId: string): any {
    return {
      id: String(tx.id),
      user_id: userId,
      account_id: tx.accountId || 'default',
      date: tx.date,
      amount: Number(tx.amount) || 0,
      type: tx.type,
      mode: tx.mode,
      platform: tx.platform || '',
      purpose: tx.purpose,
      category: tx.category,
      shopping_details: tx.shoppingDetails || null,
      created_at: new Date(tx.createdAt || Date.now()).toISOString()
    };
  }

  public static mapRowToGoal(row: any): SavingsGoal {
    return {
      id: String(row.id),
      accountId: row.account_id || 'default',
      category: row.category,
      targetAmount: Number(row.target_amount) || 0,
      month: row.month,
      notes: row.notes || undefined,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  public static mapGoalToRow(goal: SavingsGoal, userId: string): any {
    return {
      id: String(goal.id),
      user_id: userId,
      account_id: goal.accountId || 'default',
      category: goal.category,
      target_amount: Number(goal.targetAmount) || 0,
      month: goal.month,
      notes: goal.notes || null,
      created_at: new Date(goal.createdAt || Date.now()).toISOString()
    };
  }

  public static mapRowToAccount(row: any): Account {
    return {
      id: String(row.id),
      name: row.name,
      type: row.type || 'PERSONAL',
      color: row.color || 'amber',
      avatarSeed: row.avatar_seed || 'Felix',
      budgets: row.budgets || {}
    };
  }

  public static mapAccountToRow(acc: Account, userId: string): any {
    return {
      id: String(acc.id),
      user_id: userId,
      name: acc.name,
      type: acc.type,
      color: acc.color,
      avatar_seed: acc.avatarSeed,
      budgets: acc.budgets || {}
    };
  }

  // -- Supabase Database CRUD Operations --

  /**
   * Fetch all records for the authenticated user from Supabase PostgreSQL
   */
  public static async fetchUserData(userId: string): Promise<{
    transactions: Transaction[];
    goals: SavingsGoal[];
    accounts: Account[];
  }> {
    if (!isSupabaseConfigured() || !userId) {
      return { transactions: [], goals: [], accounts: [] };
    }

    // 1. Fetch Transactions
    const { data: txRows, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (txError) {
      console.error('Failed to fetch transactions from Supabase:', txError);
      throw new Error(`Failed to load transactions: ${txError.message}`);
    }

    // 2. Fetch Goals
    const { data: goalRows, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (goalError) {
      console.error('Failed to fetch goals from Supabase:', goalError);
      throw new Error(`Failed to load goals: ${goalError.message}`);
    }

    // 3. Fetch Accounts
    const { data: accRows, error: accError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (accError) {
      console.error('Failed to fetch accounts from Supabase:', accError);
      throw new Error(`Failed to load accounts: ${accError.message}`);
    }

    const transactions = (txRows || []).map(this.mapRowToTransaction);
    const goals = (goalRows || []).map(this.mapRowToGoal);
    const accounts = (accRows || []).map(this.mapRowToAccount);

    return { transactions, goals, accounts };
  }

  /**
   * Persist a transaction to Supabase (Insert or Update)
   */
  public static async saveTransaction(tx: Transaction, userId: string): Promise<Transaction> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const row = this.mapTransactionToRow(tx, userId);
    const { data, error } = await supabase
      .from('transactions')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase save transaction failed:', error);
      throw new Error(error.message);
    }

    return this.mapRowToTransaction(data);
  }

  /**
   * Delete a transaction from Supabase
   */
  public static async deleteTransaction(id: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase delete transaction failed:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Persist a savings goal to Supabase (Insert or Update)
   */
  public static async saveGoal(goal: SavingsGoal, userId: string): Promise<SavingsGoal> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const row = this.mapGoalToRow(goal, userId);
    const { data, error } = await supabase
      .from('goals')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase save goal failed:', error);
      throw new Error(error.message);
    }

    return this.mapRowToGoal(data);
  }

  /**
   * Delete a savings goal from Supabase
   */
  public static async deleteGoal(id: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase delete goal failed:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Persist an account to Supabase
   */
  public static async saveAccount(acc: Account, userId: string): Promise<Account> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const row = this.mapAccountToRow(acc, userId);
    const { data, error } = await supabase
      .from('accounts')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase save account failed:', error);
      throw new Error(error.message);
    }

    return this.mapRowToAccount(data);
  }

  /**
   * Delete an account from Supabase
   */
  public static async deleteAccount(id: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase delete account failed:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Seed / migrate existing local data to Supabase if Supabase is currently empty for this user
   */
  public static async seedInitialDataIfEmpty(
    userId: string,
    initialTransactions: Transaction[],
    initialGoals: SavingsGoal[],
    initialAccounts: Account[]
  ): Promise<{ transactions: Transaction[]; goals: SavingsGoal[]; accounts: Account[] }> {
    const existing = await this.fetchUserData(userId);

    // If Supabase already has data for this user, return the cloud data as single source of truth
    if (existing.transactions.length > 0 || existing.goals.length > 0 || existing.accounts.length > 0) {
      return existing;
    }

    // Otherwise, seed the user's initial accounts, goals, and transactions to Supabase
    const accountsToSeed = initialAccounts.length > 0 ? initialAccounts : [
      {
        id: `acc-${userId}`,
        name: 'Personal',
        type: 'PERSONAL' as const,
        color: 'amber',
        avatarSeed: 'Felix',
        budgets: {}
      }
    ];

    for (const acc of accountsToSeed) {
      try {
        await this.saveAccount(acc, userId);
      } catch (e) {
        console.warn('Failed to seed account:', e);
      }
    }

    for (const goal of initialGoals) {
      try {
        await this.saveGoal(goal, userId);
      } catch (e) {
        console.warn('Failed to seed goal:', e);
      }
    }

    for (const tx of initialTransactions) {
      try {
        await this.saveTransaction(tx, userId);
      } catch (e) {
        console.warn('Failed to seed transaction:', e);
      }
    }

    return await this.fetchUserData(userId);
  }

  // -- Supabase Realtime Subscription Management --

  /**
   * Subscribe to live Supabase Realtime changes on transactions, goals, and accounts
   */
  public static subscribeToUserChanges(
    userId: string,
    callbacks: {
      onTransactionInsert?: (tx: Transaction) => void;
      onTransactionUpdate?: (tx: Transaction) => void;
      onTransactionDelete?: (id: string) => void;
      onGoalInsert?: (goal: SavingsGoal) => void;
      onGoalUpdate?: (goal: SavingsGoal) => void;
      onGoalDelete?: (id: string) => void;
      onAccountChange?: () => void;
      onStatusChange?: (status: string) => void;
    }
  ): () => void {
    if (!isSupabaseConfigured() || !userId) {
      return () => {};
    }

    // Unsubscribe from any prior channel
    this.unsubscribe();
    this.activeUserId = userId;

    const channelName = `realtime-user-${userId}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // 1. Transactions realtime listener
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newTx = this.mapRowToTransaction(payload.new);
          if (callbacks.onTransactionInsert) callbacks.onTransactionInsert(newTx);
        } else if (payload.eventType === 'UPDATE') {
          const updatedTx = this.mapRowToTransaction(payload.new);
          if (callbacks.onTransactionUpdate) callbacks.onTransactionUpdate(updatedTx);
        } else if (payload.eventType === 'DELETE') {
          const deletedId = String(payload.old?.id);
          if (deletedId && callbacks.onTransactionDelete) {
            callbacks.onTransactionDelete(deletedId);
          }
        }
      }
    );

    // 2. Goals realtime listener
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newGoal = this.mapRowToGoal(payload.new);
          if (callbacks.onGoalInsert) callbacks.onGoalInsert(newGoal);
        } else if (payload.eventType === 'UPDATE') {
          const updatedGoal = this.mapRowToGoal(payload.new);
          if (callbacks.onGoalUpdate) callbacks.onGoalUpdate(updatedGoal);
        } else if (payload.eventType === 'DELETE') {
          const deletedId = String(payload.old?.id);
          if (deletedId && callbacks.onGoalDelete) {
            callbacks.onGoalDelete(deletedId);
          }
        }
      }
    );

    // 3. Accounts realtime listener
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'accounts',
        filter: `user_id=eq.${userId}`
      },
      () => {
        if (callbacks.onAccountChange) callbacks.onAccountChange();
      }
    );

    channel.subscribe((status) => {
      if (callbacks.onStatusChange) {
        callbacks.onStatusChange(status);
      }
    });

    this.realtimeChannel = channel;

    return () => {
      this.unsubscribe();
    };
  }

  /**
   * Unsubscribe from active Supabase Realtime channel
   */
  public static unsubscribe(): void {
    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (err) {
        console.warn('Error removing realtime channel:', err);
      }
      this.realtimeChannel = null;
      this.activeUserId = null;
    }
  }
}
