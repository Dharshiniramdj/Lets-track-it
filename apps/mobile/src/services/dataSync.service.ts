import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { storage } from './storage.service';
import { MobileTransaction, useTransactionStore } from '../store/transactionStore';
import { MobileGoal, useGoalStore } from '../store/goalStore';
import { MobileAccount, useAccountStore } from '../store/accountStore';

export class MobileDataSyncService {
  private static realtimeChannel: RealtimeChannel | null = null;

  private static getTxCacheKey(userId?: string): string {
    return userId ? `letstrackit_cached_transactions_${userId}` : 'letstrackit_cached_transactions';
  }

  private static getGoalsCacheKey(userId?: string): string {
    return userId ? `letstrackit_cached_goals_${userId}` : 'letstrackit_cached_goals';
  }

  /**
   * Load local cached data instantly (0ms latency, zero lag on app startup)
   */
  public static async getCachedData(userId?: string): Promise<{
    transactions: MobileTransaction[];
    goals: MobileGoal[];
  }> {
    try {
      const [txRaw, goalsRaw] = await Promise.all([
        storage.getItem(this.getTxCacheKey(userId)),
        storage.getItem(this.getGoalsCacheKey(userId))
      ]);

      const transactions: MobileTransaction[] = txRaw ? JSON.parse(txRaw) : [];
      const goals: MobileGoal[] = goalsRaw ? JSON.parse(goalsRaw) : [];
      return { transactions, goals };
    } catch {
      return { transactions: [], goals: [] };
    }
  }

  /**
   * Fetch all records directly from Supabase PostgreSQL (HTTPS)
   */
  public static async fetchUserData(userId: string): Promise<{
    transactions: MobileTransaction[];
    goals: MobileGoal[];
    accounts: MobileAccount[];
  }> {
    if (!isSupabaseConfigured() || !userId) {
      return { transactions: [], goals: [], accounts: [] };
    }

    try {
      const [txRes, goalsRes, accountsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(200),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userId)
      ]);

      if (txRes.error) {
        console.warn('[DataSyncService] Error fetching transactions:', txRes.error.message);
      }
      if (goalsRes.error) {
        console.warn('[DataSyncService] Error fetching goals:', goalsRes.error.message);
      }

      const transactions: MobileTransaction[] = (txRes.data || []).map((row: any) => ({
        id: String(row.id),
        accountId: row.account_id || `acc-${userId}`,
        amount: Number(row.amount) || 0,
        type: row.type || 'EXPENSE',
        mode: row.mode || 'UPI',
        platform: row.platform || '',
        purpose: row.purpose || '',
        category: row.category || 'OTHERS',
        date: row.date ? (typeof row.date === 'string' ? row.date.split('T')[0] : row.date) : new Date().toISOString().split('T')[0],
        receiptUrl: row.receipt_url || row.shopping_details?.receiptUrl || undefined,
        receiptFileName: row.shopping_details?.receiptFileName || undefined,
        description: row.description || undefined,
        tags: row.tags || undefined,
        shoppingDetails: row.shopping_details || undefined,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
      }));

      const goals: MobileGoal[] = (goalsRes.data || []).map((row: any) => ({
        id: String(row.id),
        accountId: row.account_id || `acc-${userId}`,
        category: row.category || 'GENERAL',
        targetAmount: Number(row.target_amount) || 0,
        actualSpent: 0,
        remainingBuffer: Number(row.target_amount) || 0,
        percentageConsumed: 0,
        dailyRecommendedPace: 0,
        status: 'SAFE',
        colorCode: 'GREEN',
        month: row.month || new Date().toISOString().slice(0, 7),
        notes: row.notes || undefined
      }));

      const accounts: MobileAccount[] = (accountsRes.data || []).map((row: any) => ({
        id: String(row.id),
        name: row.name || 'Personal',
        type: (row.type as any) || 'PERSONAL',
        color: row.color || '#FC734D',
        avatarSeed: row.avatar_seed || 'User',
        ownerId: row.user_id || userId,
        members: [{ userId, role: 'OWNER' as const }]
      }));

      // Cache locally in background for instant offline access
      await Promise.all([
        storage.setItem(this.getTxCacheKey(userId), JSON.stringify(transactions)),
        storage.setItem(this.getGoalsCacheKey(userId), JSON.stringify(goals))
      ]);

      return { transactions, goals, accounts };
    } catch (err) {
      console.warn('[DataSyncService] Direct Supabase data fetch error:', err);
      const cached = await this.getCachedData(userId);
      return { ...cached, accounts: [] };
    }
  }

  /**
   * Sync and hydrate all stores for a specific user
   */
  public static async syncAll(userId: string): Promise<void> {
    if (!userId) return;

    // 1. Immediately hydrate with cached data for 0ms lag
    const cached = await this.getCachedData(userId);
    if (cached.transactions.length > 0) {
      useTransactionStore.getState().setTransactions(cached.transactions);
    }
    if (cached.goals.length > 0) {
      useGoalStore.getState().setGoals(cached.goals);
    }

    // 2. Fetch fresh from Supabase and update stores
    const remote = await this.fetchUserData(userId);
    if (remote.transactions.length > 0 || cached.transactions.length === 0) {
      useTransactionStore.getState().setTransactions(remote.transactions);
    }
    if (remote.goals.length > 0 || cached.goals.length === 0) {
      useGoalStore.getState().setGoals(remote.goals);
    }
    if (remote.accounts.length > 0) {
      useAccountStore.getState().setAccounts(remote.accounts);
    }
  }

  /**
   * Save a transaction to Supabase (Instant background sync)
   */
  public static async saveTransaction(tx: MobileTransaction, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    try {
      const shoppingWithReceipt = tx.shoppingDetails || (tx.receiptUrl ? {
        appName: tx.platform || 'Store',
        productName: tx.purpose,
        status: 'DELIVERED' as const,
        orderedDate: new Date().toISOString(),
        receiptUrl: tx.receiptUrl,
        receiptFileName: tx.receiptFileName
      } : null);

      if (shoppingWithReceipt && tx.receiptUrl) {
        (shoppingWithReceipt as any).receiptUrl = tx.receiptUrl;
        (shoppingWithReceipt as any).receiptFileName = tx.receiptFileName;
      }

      const row = {
        id: tx.id,
        user_id: userId,
        account_id: tx.accountId || `acc-${userId}`,
        amount: tx.amount,
        type: tx.type,
        mode: tx.mode,
        platform: tx.platform || '',
        purpose: tx.purpose,
        category: tx.category,
        date: tx.date,
        receipt_url: tx.receiptUrl || null,
        description: tx.description || null,
        tags: tx.tags || null,
        shopping_details: shoppingWithReceipt,
        created_at: new Date(tx.createdAt || Date.now()).toISOString()
      };

      const { error } = await supabase.from('transactions').upsert(row, { onConflict: 'id' });
      if (error) {
        console.warn('[DataSyncService] Supabase transaction save error:', error.message);
        return false;
      }

      // Update local cache
      const currentList = useTransactionStore.getState().transactions;
      await storage.setItem(this.getTxCacheKey(userId), JSON.stringify(currentList));
      return true;
    } catch (e) {
      console.warn('[DataSyncService] Background Supabase transaction save exception:', e);
      return false;
    }
  }

  /**
   * Delete transaction from Supabase
   */
  public static async deleteTransaction(txId: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured() || !userId) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', txId).eq('user_id', userId);
      if (error) {
        console.warn('[DataSyncService] Delete transaction error:', error.message);
      }
      const currentList = useTransactionStore.getState().transactions.filter(t => t.id !== txId);
      await storage.setItem(this.getTxCacheKey(userId), JSON.stringify(currentList));
    } catch (e) {
      console.warn('[DataSyncService] Background Supabase transaction delete exception:', e);
    }
  }

  /**
   * Save goal to Supabase
   */
  public static async saveGoal(goal: MobileGoal, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;
    try {
      const row = {
        id: goal.id,
        user_id: userId,
        account_id: goal.accountId || `acc-${userId}`,
        category: goal.category,
        target_amount: goal.targetAmount,
        month: goal.month,
        notes: goal.notes || null,
        created_at: new Date().toISOString()
      };
      const { error } = await supabase.from('goals').upsert(row, { onConflict: 'id' });
      if (error) {
        console.warn('[DataSyncService] Supabase goal save error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[DataSyncService] Background Supabase goal save exception:', e);
      return false;
    }
  }

  /**
   * Subscribe to live Realtime database changes
   */
  public static subscribeToRealtime(userId: string, onUpdate?: () => void): () => void {
    if (!isSupabaseConfigured() || !userId) return () => {};

    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    try {
      this.realtimeChannel = supabase
        .channel(`mobile-sync-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
          async () => {
            const data = await this.fetchUserData(userId);
            useTransactionStore.getState().setTransactions(data.transactions);
            if (onUpdate) onUpdate();
          }
        )
        .subscribe();

      return () => {
        if (this.realtimeChannel) {
          this.realtimeChannel.unsubscribe();
          this.realtimeChannel = null;
        }
      };
    } catch (e) {
      console.warn('[DataSyncService] Realtime subscription error:', e);
      return () => {};
    }
  }
}
