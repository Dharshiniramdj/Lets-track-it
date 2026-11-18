import { create } from 'zustand';

export interface MobileShoppingDetails {
  appName: string;
  productName: string;
  forWhom?: string;
  orderedDate: string;
  deliveryDate?: string;
  status: 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED';
  subItems?: Array<{ name: string; qty: number; price: number }>;
}

export interface MobileTransaction {
  id: string;
  accountId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  mode: 'UPI' | 'CASH' | 'CARD' | 'NET_BANKING' | 'OTHER';
  platform: string;
  purpose: string;
  category: string;
  date: string;
  receiptUrl?: string; // Stored image / document attachment or base64
  receiptFileName?: string;
  description?: string;
  tags?: string[];
  idempotencyKey?: string;
  shoppingDetails?: MobileShoppingDetails;
  createdAt: number;
}

export interface FinancialSummaryState {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  shoppingSpends: number;
  activeDeliveriesCount: number;
  categoryBreakdown: Record<string, number>;
  dailyAverageExpense: number;
}

interface TransactionState {
  transactions: MobileTransaction[];
  summary: FinancialSummaryState | null;
  filter: {
    accountId?: string;
    category?: string;
    type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    isShoppingOnly: boolean;
  };
  isLoading: boolean;

  setTransactions: (transactions: MobileTransaction[]) => void;
  addTransaction: (tx: MobileTransaction) => void;
  updateDeliveryStatus: (txId: string, status: 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED', deliveryDate?: string) => void;
  removeTransaction: (txId: string) => void;
  clearTransactions: () => void;
  setSummary: (summary: FinancialSummaryState) => void;
  setFilter: (filter: Partial<TransactionState['filter']>) => void;
  recalculateSummary: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  summary: null,
  filter: {
    isShoppingOnly: false
  },
  isLoading: false,

  setTransactions: (transactions) => {
    set({ transactions });
    get().recalculateSummary();
  },

  addTransaction: (tx) => {
    set((state) => ({
      transactions: [tx, ...state.transactions.filter(t => t.id !== tx.id)]
    }));
    get().recalculateSummary();
  },

  updateDeliveryStatus: (txId, status, deliveryDate) => {
    set((state) => ({
      transactions: state.transactions.map((tx) => {
        if (tx.id === txId && tx.shoppingDetails) {
          return {
            ...tx,
            shoppingDetails: {
              ...tx.shoppingDetails,
              status,
              deliveryDate: deliveryDate || tx.shoppingDetails.deliveryDate
            }
          };
        }
        return tx;
      })
    }));
    get().recalculateSummary();
  },

  removeTransaction: (txId) => {
    set((state) => ({
      transactions: state.transactions.filter((tx) => tx.id !== txId)
    }));
    get().recalculateSummary();
  },

  clearTransactions: () => {
    set({ transactions: [], summary: null });
  },

  setSummary: (summary) => set({ summary }),

  setFilter: (filterUpdates) =>
    set((state) => ({
      filter: { ...state.filter, ...filterUpdates }
    })),

  recalculateSummary: () => {
    const { transactions } = get();
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

    const todayDate = new Date().getDate();
    const passedDays = Math.max(1, todayDate);
    const dailyAverageExpense = Math.round(((totalExpense / passedDays) + Number.EPSILON) * 100) / 100;

    set({
      summary: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        netBalance: Math.round((totalIncome - totalExpense) * 100) / 100,
        shoppingSpends: Math.round(shoppingSpends * 100) / 100,
        activeDeliveriesCount,
        categoryBreakdown,
        dailyAverageExpense
      }
    });
  }
}));
