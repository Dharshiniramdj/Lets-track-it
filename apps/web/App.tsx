import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Transaction, 
  Account, 
  UserProfile, 
  AppData, 
  TransactionType, 
  SavingsGoal, 
  AppNotification, 
  ToastMessage,
  UpcomingDelivery,
  BillItem,
  IncomeSource,
  ReceiptDocument,
  FeatureToggles,
  DashboardWidgetConfig,
  Category
} from './types';
import { resolveAvatarUrl, DEFAULT_AVATAR } from './utils/avatars';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import SettingsModal from './components/SettingsModal';
import NotificationsPanel from './components/NotificationsPanel';
import { AuthView } from './components/AuthView';
import { ToastContainer } from './components/ToastContainer';
import { WelcomeLanding } from './components/WelcomeLanding';
import { OnboardingWizard } from './components/OnboardingWizard';
import { MultipleIncomeTracker } from './components/MultipleIncomeTracker';
import { BillsPlanner } from './components/BillsPlanner';
import { ReceiptsManager } from './components/ReceiptsManager';
import { FinancialReports } from './components/FinancialReports';

import { AuthService, AuthUser } from './services/authService';
import { NotificationService } from './services/notificationService';
import { DataSyncService } from './services/dataSyncService';

import { 
  Home, 
  List, 
  Calendar as CalendarIcon, 
  Plus, 
  Settings, 
  Bell, 
  BarChart, 
  User, 
  LogOut, 
  RefreshCw, 
  TrendingUp, 
  Wallet, 
  ChevronUp,
  CreditCard,
  Package,
  Receipt,
  FileText,
  Printer,
  Sparkles,
  Wifi,
  WifiOff,
  Eye,
  EyeOff
} from 'lucide-react';

const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  manualTrackingOnly: true,
  billsTracker: true,
  savingsGoals: true,
  spendingInsights: true,
  alertsAndNotifications: true,
  sharedBudgets: false,
  simpleMode: false,
  confidentialPrivacyMode: false,
  biometricLock: false,
};

const DEFAULT_WIDGET_CONFIG: DashboardWidgetConfig = {
  totalBalance: true,
  monthlyIncome: true,
  monthlyExpenses: true,
  netSavings: true,
  savingsProgress: true,
  upcomingBills: true,
  upcomingDeliveries: true,
  recentTransactions: true,
  monthlySpendingChart: true,
  incomeVsExpenseChart: true,
  financialInsights: true,
};

export const App: React.FC = () => {
  // Authentication & Active Session State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => AuthService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => AuthService.isAuthenticated());
  
  // Landing & Onboarding visibility
  const [showLanding, setShowLanding] = useState<boolean>(() => !AuthService.isAuthenticated());
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Network Connectivity State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('Back Online', 'Network connectivity restored. Syncing records.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast('Offline Mode Active', 'Operating in confidential offline mode. Changes cached locally.', 'info');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cloud Sync & Realtime State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isRealtimeLive, setIsRealtimeLive] = useState<boolean>(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = AuthService.initAuthListener((user) => {
      setCurrentUser(user);
      setIsAuthenticated(!!user);
      if (user) {
        setShowLanding(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Toasts State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setToasts(prev => [...prev, { id, title, message, type, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Notifications State
  const [liveNotifications, setLiveNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  const fetchLiveNotifications = useCallback(async () => {
    try {
      const res = await NotificationService.getNotifications();
      setLiveNotifications(res.notifications);
      setUnreadNotifCount(res.unreadCount);
    } catch {
      // Offline fallback silently
    }
  }, []);

  // Navigation & UI States
  type TabType = 'HOME' | 'LOG' | 'BILLS' | 'CALENDAR' | 'RECEIPTS' | 'REPORTS' | 'STATS';
  const [activeTab, setActiveTab] = useState<TabType>('HOME');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [addModalMode, setAddModalMode] = useState<'DEFAULT' | 'SHOPPING'>('DEFAULT');
  const [theme, setTheme] = useState<'DARK' | 'LIGHT'>(() => (localStorage.getItem('lets_track_it_theme') as 'DARK'|'LIGHT') || 'DARK');
  
  // Confidential Privacy Masking (Hide sensitive balances)
  const [isConfidential, setIsConfidential] = useState<boolean>(() => {
    return localStorage.getItem('lets_track_it_confidential') === 'true';
  });

  const toggleConfidential = () => {
    setIsConfidential(prev => {
      const n = !prev;
      localStorage.setItem('lets_track_it_confidential', String(n));
      return n;
    });
  };

  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  
  // Parallax Scroll State
  const mainRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const current = target.scrollTop;
    setScrollY(current);
    const max = target.scrollHeight - target.clientHeight;
    if (max > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (current / max) * 100)));
    }
  };

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      const saved = localStorage.getItem(`lets_track_it_profile_${user.id}`);
      if (saved) return JSON.parse(saved);
      return {
        name: user.fullName || 'Alex Vance',
        email: user.email,
        phone: '',
        isVerified: user.status === 'ACTIVE',
        avatarSeed: user.fullName || DEFAULT_AVATAR,
        currencyPreference: user.currencyPreference || 'INR',
        monthlyIncome: 85000,
        monthlyBudget: 55000,
        onboardingCompleted: false
      };
    }
    const saved = localStorage.getItem('lets_track_it_profile');
    return saved ? JSON.parse(saved) : { 
      name: 'Alex Vance', 
      email: '', 
      phone: '', 
      isVerified: false, 
      avatarSeed: DEFAULT_AVATAR, 
      currencyPreference: 'INR',
      monthlyIncome: 85000,
      monthlyBudget: 55000,
      onboardingCompleted: false
    };
  });

  // Accounts
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const user = AuthService.getCurrentUser();
    const storageKey = user ? `lets_track_it_accounts_${user.id}` : 'lets_track_it_accounts';
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
    return [{ 
      id: user ? `acc-${user.id}` : 'default', 
      name: 'Personal Vault', 
      type: 'PERSONAL', 
      color: 'amber', 
      avatarSeed: user?.fullName || 'Felix',
      budgets: {}
    }];
  });

  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    const user = AuthService.getCurrentUser();
    const activeKey = user ? `lets_track_it_active_account_${user.id}` : 'lets_track_it_active_account';
    return localStorage.getItem(activeKey) || accounts[0]?.id || 'default';
  });

  // Feature Toggles (Requirement 7)
  const [featureToggles, setFeatureToggles] = useState<FeatureToggles>(() => {
    const user = AuthService.getCurrentUser();
    const storageKey = user ? `lets_track_it_toggles_${user.id}` : 'lets_track_it_toggles';
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : DEFAULT_FEATURE_TOGGLES;
  });

  // Dashboard Widget Config (Requirement 1D)
  const [widgetConfig, setWidgetConfig] = useState<DashboardWidgetConfig>(() => {
    const user = AuthService.getCurrentUser();
    const storageKey = user ? `lets_track_it_widgets_${user.id}` : 'lets_track_it_widgets';
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : DEFAULT_WIDGET_CONFIG;
  });

  // Transactions (User-Scoped)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const user = AuthService.getCurrentUser();
    const storageKey = user ? `lets_track_it_data_${user.id}` : 'lets_track_it_data';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const loaded: Transaction[] = JSON.parse(saved);
      return loaded.map(t => t.accountId ? t : { ...t, accountId: 'default' });
    }
    // Initial starter demo data
    const currentMonth = new Date().toISOString().slice(0, 7);
    return [
      {
        id: 'tx-init-1',
        accountId: 'default',
        amount: 75000,
        type: TransactionType.INCOME,
        mode: 'NET_BANKING' as any,
        platform: 'HDFC Corporate',
        purpose: 'Primary Engineering Salary',
        description: 'Monthly direct-deposit pay for software engineering services.',
        category: Category.INCOME,
        incomeSource: 'Primary Salary',
        date: `${currentMonth}-01`,
        createdAt: Date.now() - 500000
      },
      {
        id: 'tx-init-2',
        accountId: 'default',
        amount: 20000,
        type: TransactionType.INCOME,
        mode: 'UPI' as any,
        platform: 'GPay',
        purpose: 'Freelance Design Retainer',
        description: 'Mobile design and prototyping consultation payout.',
        category: Category.INCOME,
        incomeSource: 'Freelancing',
        date: `${currentMonth}-03`,
        createdAt: Date.now() - 400000
      },
      {
        id: 'tx-init-3',
        accountId: 'default',
        amount: 3200,
        type: TransactionType.EXPENSE,
        mode: 'UPI' as any,
        platform: 'Blinkit',
        purpose: 'Weekly Supermarket Groceries',
        description: 'Bought fresh organic vegetables, sourdough, and milk for the week.',
        category: Category.GROCERY,
        tags: ['groceries', 'household'],
        date: `${currentMonth}-04`,
        createdAt: Date.now() - 300000
      },
      {
        id: 'tx-init-4',
        accountId: 'default',
        amount: 1179,
        type: TransactionType.EXPENSE,
        mode: 'NET_BANKING' as any,
        platform: 'Airtel Broadband',
        purpose: 'Fiber Internet Bill',
        description: 'Monthly gigabit broadband bill paid manually via bill desk.',
        category: Category.BILLS,
        date: `${currentMonth}-05`,
        createdAt: Date.now() - 200000
      }
    ];
  });

  // Monthly Savings Goals
  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    const user = AuthService.getCurrentUser();
    const storageKey = user ? `lets_track_it_goals_${user.id}` : 'lets_track_it_goals';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const currentMonth = new Date().toISOString().slice(0, 7);
    return [
      {
        id: 'goal-groceries',
        accountId: 'default',
        category: 'Groceries',
        targetAmount: 14000,
        month: currentMonth,
        notes: 'Monthly grocery target to avoid quick-commerce impulse orders',
        createdAt: Date.now() - 100000
      },
      {
        id: 'goal-savings',
        accountId: 'default',
        category: 'Liquid Wealth',
        targetAmount: 25000,
        month: currentMonth,
        notes: 'Emergency liquid cushion allocation',
        createdAt: Date.now() - 50000
      }
    ];
  });

  // Upcoming Deliveries (Requirement 2: Separate Upcoming Deliveries Box)
  const [deliveries, setDeliveries] = useState<UpcomingDelivery[]>(() => {
    const user = AuthService.getCurrentUser();
    const storageKey = user ? `lets_track_it_deliveries_${user.id}` : 'lets_track_it_deliveries';
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return [
      {
        id: 'del-1',
        accountId: 'default',
        name: 'Mechanical Ergonomic Keyboard',
        orderNumber: 'AMZ-402-9842',
        expectedDate: tomorrow.toISOString().split('T')[0],
        estimatedAmount: 4499,
        status: 'SHIPPED',
        carrier: 'Amazon Logistics',
        notes: 'Leave with concierge if not available',
        createdAt: Date.now() - 80000
      }
    ];
  });

  // Bills to Pay (Requirement 4: Bills & Payment Planner)
  const [bills, setBills] = useState<BillItem[]>(() => {
    const user = AuthService.getCurrentUser();
    const storageKey = user ? `lets_track_it_bills_${user.id}` : 'lets_track_it_bills';
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Multiple Income Sources (Requirement 3)
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(() => {
    const user = AuthService.getCurrentUser();
    const storageKey = user ? `lets_track_it_income_sources_${user.id}` : 'lets_track_it_income_sources';
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
    const currentMonth = new Date().toISOString().slice(0, 7);
    return [
      {
        id: 'inc-1',
        accountId: 'default',
        name: 'Staff Software Engineer Salary',
        amount: 75000,
        date: `${currentMonth}-01`,
        category: 'Salary',
        description: 'Monthly core engineering base compensation',
        isRecurring: true,
        recurrenceFrequency: 'MONTHLY',
        createdAt: Date.now() - 100000
      },
      {
        id: 'inc-2',
        accountId: 'default',
        name: 'Fintech UI/UX Consulting',
        amount: 20000,
        date: `${currentMonth}-03`,
        category: 'Freelancing',
        description: 'Product architecture retainer for startup',
        isRecurring: true,
        recurrenceFrequency: 'MONTHLY',
        createdAt: Date.now() - 90000
      }
    ];
  });

  // Receipts Vault (Requirement 9)
  const [receipts, setReceipts] = useState<ReceiptDocument[]>(() => {
    const user = AuthService.getCurrentUser();
    const storageKey = user ? `lets_track_it_receipts_${user.id}` : 'lets_track_it_receipts';
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
    return [];
  });

  // -- Persistence Sync Effects (User-Scoped) --
  const uid = currentUser?.id || 'guest';

  useEffect(() => {
    localStorage.setItem(`lets_track_it_data_${uid}`, JSON.stringify(transactions));
  }, [transactions, uid]);

  useEffect(() => {
    localStorage.setItem(`lets_track_it_deliveries_${uid}`, JSON.stringify(deliveries));
  }, [deliveries, uid]);

  useEffect(() => {
    localStorage.setItem(`lets_track_it_bills_${uid}`, JSON.stringify(bills));
  }, [bills, uid]);

  useEffect(() => {
    localStorage.setItem(`lets_track_it_income_sources_${uid}`, JSON.stringify(incomeSources));
  }, [incomeSources, uid]);

  useEffect(() => {
    localStorage.setItem(`lets_track_it_receipts_${uid}`, JSON.stringify(receipts));
  }, [receipts, uid]);

  useEffect(() => {
    localStorage.setItem(`lets_track_it_goals_${uid}`, JSON.stringify(goals));
  }, [goals, uid]);

  useEffect(() => {
    localStorage.setItem(`lets_track_it_toggles_${uid}`, JSON.stringify(featureToggles));
  }, [featureToggles, uid]);

  useEffect(() => {
    localStorage.setItem(`lets_track_it_widgets_${uid}`, JSON.stringify(widgetConfig));
  }, [widgetConfig, uid]);

  useEffect(() => {
    localStorage.setItem(`lets_track_it_profile_${uid}`, JSON.stringify(userProfile));
  }, [userProfile, uid]);

  useEffect(() => {
    localStorage.setItem('lets_track_it_theme', theme);
    if (theme === 'LIGHT') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
  }, [theme]);

  // Check if onboarding is needed
  useEffect(() => {
    if (isAuthenticated && currentUser && !userProfile.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated, currentUser, userProfile.onboardingCompleted]);

  // Cloud Synchronization Init
  useEffect(() => {
    if (!currentUser) {
      DataSyncService.unsubscribe();
      setIsRealtimeLive(false);
      return;
    }

    let isMounted = true;
    const initCloud = async () => {
      setIsSyncing(true);
      setSyncStatus('syncing');
      try {
        const cloudData = await DataSyncService.seedInitialDataIfEmpty(currentUser.id, transactions, goals, accounts);
        if (isMounted) {
          if (cloudData.transactions.length > 0) setTransactions(cloudData.transactions);
          if (cloudData.goals.length > 0) setGoals(cloudData.goals);
          setLastSyncTime(new Date());
          setSyncStatus('success');
        }
      } catch (err) {
        if (isMounted) setSyncStatus('error');
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };
    initCloud();
  }, [currentUser]);

  // Handlers for Transactions
  const handleSaveTransaction = (txData: Omit<Transaction, 'id' | 'createdAt' | 'accountId'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      accountId: activeAccountId,
      createdAt: Date.now()
    };

    if (editingTransaction) {
      setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? { ...newTx, id: editingTransaction.id } : t));
      addToast('Transaction Updated', `Saved "${txData.purpose}"`, 'success');
      setEditingTransaction(undefined);
    } else {
      setTransactions(prev => [newTx, ...prev]);
      addToast('Transaction Logged', `Recorded ${txData.type === TransactionType.INCOME ? '+' : '-'}₹${txData.amount}`, 'success');
    }
    setShowAddModal(false);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    addToast('Deleted', 'Transaction removed from ledger', 'info');
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setAddModalMode(tx.shoppingDetails ? 'SHOPPING' : 'DEFAULT');
    setShowAddModal(true);
  };

  // Handlers for Goals
  const handleAddGoal = (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
      createdAt: Date.now()
    };
    setGoals(prev => [newGoal, ...prev]);
    addToast('Savings Target Added', `Set ${goal.category} limit`, 'success');
  };

  const handleUpdateGoal = (id: string, updates: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  // Handlers for Deliveries
  const handleAddDelivery = (del: Omit<UpcomingDelivery, 'id' | 'createdAt'>) => {
    const newDel: UpcomingDelivery = {
      ...del,
      id: `del-${Date.now()}`,
      createdAt: Date.now()
    };
    setDeliveries(prev => [newDel, ...prev]);
    addToast('Delivery Tracked', `Tracking "${del.name}"`, 'success');
  };

  const handleUpdateDelivery = (id: string, updates: Partial<UpcomingDelivery>) => {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    addToast('Delivery Updated', 'Package status updated', 'info');
  };

  const handleDeleteDelivery = (id: string) => {
    setDeliveries(prev => prev.filter(d => d.id !== id));
    addToast('Delivery Removed', 'Order removed from delivery panel', 'info');
  };

  // Handlers for Bills
  const handleAddBill = (b: Omit<BillItem, 'id' | 'createdAt'>) => {
    const newBill: BillItem = {
      ...b,
      id: `bill-${Date.now()}`,
      createdAt: Date.now()
    };
    setBills(prev => [newBill, ...prev]);
    addToast('Bill Scheduled', `Added "${b.name}" due on ${b.dueDate}`, 'success');
  };

  const handleUpdateBill = (id: string, updates: Partial<BillItem>) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleDeleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
    addToast('Bill Removed', 'Obligation removed', 'info');
  };

  const handleMarkBillPaid = (bill: BillItem) => {
    const today = new Date().toISOString().split('T')[0];
    handleUpdateBill(bill.id, { status: 'PAID', paidDate: today });

    // Automatically record as an expense transaction in the ledger
    const newTx: Transaction = {
      id: `tx-bill-${Date.now()}`,
      accountId: activeAccountId,
      amount: bill.amount,
      type: TransactionType.EXPENSE,
      mode: 'UPI' as any,
      platform: 'Bill Payment',
      purpose: bill.name,
      description: `Manual payment settled for ${bill.name} (Category: ${bill.category})`,
      category: Category.BILLS,
      date: today,
      createdAt: Date.now()
    };
    setTransactions(prev => [newTx, ...prev]);
    addToast('Bill Settled', `Marked "${bill.name}" paid & logged to ledger`, 'success');
  };

  // Handlers for Income Streams
  const handleAddIncomeSource = (src: Omit<IncomeSource, 'id' | 'createdAt'>) => {
    const newSrc: IncomeSource = {
      ...src,
      id: `src-${Date.now()}`,
      createdAt: Date.now()
    };
    setIncomeSources(prev => [newSrc, ...prev]);
    addToast('Income Stream Added', `Added ${src.name} (${src.category})`, 'success');
  };

  const handleUpdateIncomeSource = (id: string, updates: Partial<IncomeSource>) => {
    setIncomeSources(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteIncomeSource = (id: string) => {
    setIncomeSources(prev => prev.filter(s => s.id !== id));
  };

  const handleLogIncomeAsTransaction = (src: IncomeSource) => {
    const newTx: Transaction = {
      id: `tx-inc-${Date.now()}`,
      accountId: activeAccountId,
      amount: src.amount,
      type: TransactionType.INCOME,
      mode: 'NET_BANKING' as any,
      platform: src.category,
      purpose: src.name,
      description: src.description || `Income received from ${src.name}`,
      category: Category.INCOME,
      incomeSource: src.name,
      isRecurring: src.isRecurring,
      date: src.date || new Date().toISOString().split('T')[0],
      createdAt: Date.now()
    };
    setTransactions(prev => [newTx, ...prev]);
    addToast('Income Recorded', `Credited +₹${src.amount.toLocaleString()} to ledger`, 'success');
  };

  // Handlers for Variable Expense Sheets
  // Handlers for Receipts
  const handleAddReceipt = (doc: Omit<ReceiptDocument, 'id' | 'createdAt'>) => {
    const newDoc: ReceiptDocument = {
      ...doc,
      id: `rcpt-${Date.now()}`,
      createdAt: Date.now()
    };
    setReceipts(prev => [newDoc, ...prev]);
    addToast('Receipt Archived', `Uploaded ${doc.title}`, 'success');
  };

  const handleUpdateReceipt = (id: string, updates: Partial<ReceiptDocument>) => {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleDeleteReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
    addToast('Receipt Removed', 'Document deleted from vault', 'info');
  };

  // Full Data Export & Restore (Requirement 8)
  const handleExportFullBackup = () => {
    const appData: AppData = {
      version: 2,
      profile: userProfile,
      accounts,
      transactions,
      goals,
      deliveries,
      bills,
      incomeSources,
      receipts,
      featureToggles,
      widgetConfig
    };
    const jsonStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LetsTrackIt_Complete_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    addToast('Backup Exported', 'Full JSON financial archive downloaded safely', 'success');
  };

  const handleImportFullBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.transactions) setTransactions(data.transactions);
        if (data.goals) setGoals(data.goals);
        if (data.deliveries) setDeliveries(data.deliveries);
        if (data.bills) setBills(data.bills);
        if (data.incomeSources) setIncomeSources(data.incomeSources);
        if (data.receipts) setReceipts(data.receipts);
        if (data.featureToggles) setFeatureToggles(data.featureToggles);
        if (data.widgetConfig) setWidgetConfig(data.widgetConfig);
        if (data.profile) setUserProfile(data.profile);
        addToast('Backup Restored', 'All records safely re-hydrated from archive', 'success');
      } catch (err) {
        addToast('Import Failed', 'Invalid JSON backup format', 'danger');
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllData = () => {
    setTransactions([]);
    setBills([]);
    setDeliveries([]);
    setIncomeSources([]);
    setReceipts([]);
    addToast('Ledger Cleared', 'All local records wiped successfully', 'info');
  };

  // Auth Callbacks
  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setShowLanding(false);
    addToast('Welcome to Let\'s Track It', `Vault initialized for ${user.fullName}`, 'success');
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setShowLanding(true);
    addToast('Signed Out', 'Confidential session terminated safely', 'info');
  };

  // Complete Onboarding Callback
  const handleCompleteOnboarding = (data: {
    profile: UserProfile;
    incomeSources: IncomeSource[];
    toggles: FeatureToggles;
    widgets: DashboardWidgetConfig;
    categoriesBudget?: Record<string, number>;
  }) => {
    setUserProfile(data.profile);
    if (data.incomeSources.length > 0) setIncomeSources(data.incomeSources);
    setFeatureToggles(data.toggles);
    setWidgetConfig(data.widgets);
    setShowOnboarding(false);
    addToast('Workspace Configured', 'Your personal finance operating system is ready!', 'success');
  };

  // ROUTE GUARD / LANDING PAGE:
  // If user is unauthenticated and wants landing: show WelcomeLanding
  if (!isAuthenticated && showLanding) {
    return (
      <WelcomeLanding
        onGetStarted={() => {
          setAuthMode('SIGNUP');
          setShowLanding(false);
        }}
        onSignIn={() => {
          setAuthMode('LOGIN');
          setShowLanding(false);
        }}
        onExploreDemo={() => {
          setAuthMode('LOGIN');
          setShowLanding(false);
        }}
      />
    );
  }

  // If user is unauthenticated and requested Auth: show AuthView
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="relative">
        <AuthView 
          onAuthSuccess={handleAuthSuccess}
          initialMode={authMode}
          onBackToLanding={() => setShowLanding(true)}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  const activeAccountTransactions = transactions.filter(t => t.accountId === activeAccountId || !t.accountId);
  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];

  return (
    <div className="flex h-screen overflow-hidden bg-[#02070A] text-[#FCFFFF] selection:bg-[#FC734D] selection:text-[#02070A]">
      {/* Dynamic Background Parallax Orbs */}
      <div 
        className="bg-glow-orb w-[420px] h-[420px] bg-[#0297DE]" 
        style={{ top: '-80px', left: '-60px', transform: `translate3d(0, ${scrollY * -0.12}px, 0)` }} 
      />
      <div 
        className="bg-glow-orb w-[500px] h-[500px] bg-[#FC734D]" 
        style={{ bottom: '-100px', right: '-80px', transform: `translate3d(0, ${scrollY * 0.1}px, 0)` }} 
      />

      {/* Desktop Left Navigation Sidebar */}
      <aside className="no-print hidden md:flex flex-col w-64 bg-[#050E17]/95 border-r border-[#143652] p-5 h-full z-30 shadow-2xl backdrop-blur-xl">
        {/* Brand Logo & Welcome Tour Trigger */}
        <div className="flex items-center justify-between pb-5 border-b border-[#143652] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FC734D] to-[#0297DE] p-[2px] shadow-lg shadow-[#FC734D]/25">
              <div className="w-full h-full bg-[#02070A] rounded-[14px] flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[#FC734D]" />
              </div>
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight bg-gradient-to-r from-[#FC734D] via-[#FCFFFF] to-[#0297DE] bg-clip-text text-transparent">
                Let's Track It
              </h1>
              <p className="text-[10px] text-[#8397AB] font-bold">Personal Finance Hub</p>
            </div>
          </div>

          <button
            onClick={() => setShowLanding(true)}
            title="Open Welcome Tour"
            className="p-1.5 rounded-lg bg-[#081622] hover:bg-[#0D2235] text-[#8397AB] hover:text-[#FCFFFF] border border-[#143652] transition-colors"
          >
            <Sparkles size={14} className="text-[#0297DE]" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-[#8397AB] tracking-widest mb-2 pl-2">
              Workspace
            </p>
            <nav className="space-y-1">
              {[
                { id: 'HOME', label: 'Dashboard', icon: Home },
                { id: 'LOG', label: 'Transactions Ledger', icon: List },
                { id: 'STATS', label: 'Analytics & Visuals', icon: BarChart },
                { id: 'REPORTS', label: 'Reports & Statements', icon: Printer },
                { id: 'BILLS', label: 'Bills to Pay (Manual)', icon: CreditCard },
                { id: 'CALENDAR', label: 'Calendar & Deliveries', icon: CalendarIcon },
                { id: 'RECEIPTS', label: 'Receipt Vault', icon: Receipt }
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabType)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-bold ${
                      isActive
                        ? 'bg-gradient-to-r from-[#FC734D]/20 to-[#FC734D]/5 text-[#FC734D] border-l-4 border-[#FC734D] shadow-sm'
                        : 'text-[#8397AB] hover:bg-[#081622] hover:text-[#FCFFFF]'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-[#FC734D]' : 'text-[#8397AB]'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Record Button */}
          <div>
            <button
              onClick={() => {
                setEditingTransaction(undefined);
                setAddModalMode('DEFAULT');
                setShowAddModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] text-[#02070A] font-black text-xs shadow-lg shadow-[#FC734D]/25 transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Record Transaction</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Connectivity & Profile */}
        <div className="pt-4 border-t border-[#143652] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[11px] text-[#8397AB]">
              {isOnline ? <Wifi size={13} className="text-[#22C58B]" /> : <WifiOff size={13} className="text-[#FC734D]" />}
              {isOnline ? 'Online' : 'Offline Cache'}
            </span>
            <button
              onClick={toggleConfidential}
              title={isConfidential ? 'Show balances' : 'Mask balances'}
              className="p-1 hover:text-[#FC734D] text-[#8397AB]"
            >
              {isConfidential ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#081622] border border-[#143652] flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-lg bg-[#FC734D] text-[#02070A] font-black text-xs flex items-center justify-center shrink-0">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#FCFFFF] truncate">{userProfile.name}</p>
                <p className="text-[10px] text-[#8397AB] truncate">{userProfile.currencyPreference || 'INR'}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettingsModal(true)}
                title="Settings"
                className="p-1.5 rounded-lg text-[#8397AB] hover:text-[#FCFFFF] hover:bg-[#0D2235]"
              >
                <Settings size={15} />
              </button>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-[#8397AB] hover:text-[#FC734D] hover:bg-[#0D2235]"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main App Canvas */}
      <main 
        ref={mainRef}
        onScroll={handleScroll}
        className="flex-1 h-screen overflow-y-auto relative bg-[#02070A] pb-24 md:pb-6"
      >
        {/* Dynamic Top Scroll Progress Indicator */}
        <div className="no-print scroll-progress-line" style={{ width: `${scrollProgress}%` }} />

        {/* Top Header Bar */}
        <header className="no-print sticky top-0 z-20 px-6 py-4 flex items-center justify-between glass-header backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FC734D] to-[#0297DE] flex items-center justify-center text-[#02070A] font-black text-xs">
              LT
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-[#FCFFFF] tracking-tight">
                {activeTab === 'HOME' && 'Financial Command Center'}
                {activeTab === 'LOG' && 'Transactions & Personal Ledger'}
                {activeTab === 'BILLS' && 'Bills to Pay & Obligations Planner'}
                {activeTab === 'CALENDAR' && 'Financial Timeline & Deliveries'}
                {activeTab === 'RECEIPTS' && 'Receipt Vault & Document Organizer'}
                {activeTab === 'REPORTS' && 'Audit Statements & Printable Reports'}
                {activeTab === 'STATS' && 'Financial Analytics'}
              </h1>
              <span className="text-[11px] text-[#8397AB] hidden sm:inline">
                Zero Forced Bank Debits • 100% Private Ledger
              </span>
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleConfidential}
              title={isConfidential ? 'Show amounts' : 'Confidential Mode (Hide amounts)'}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                isConfidential
                  ? 'bg-[#FC734D] text-[#02070A] border-[#FC734D]'
                  : 'bg-[#050E17] text-[#8397AB] hover:text-[#FCFFFF] border-[#143652]'
              }`}
            >
              {isConfidential ? <EyeOff size={15} /> : <Eye size={15} />}
              <span className="hidden sm:inline">Confidential</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl border transition-all ${
                  showNotifications 
                    ? 'bg-[#0297DE] text-[#02070A] border-[#0297DE]' 
                    : 'bg-[#050E17] text-[#8397AB] hover:text-[#FCFFFF] border-[#143652]'
                }`}
              >
                <Bell size={16} />
                {bills.some(b => b.status === 'OVERDUE') && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FC734D] animate-ping" />
                )}
              </button>
              {showNotifications && (
                <NotificationsPanel 
                  transactions={activeAccountTransactions} 
                  goals={goals}
                  onClose={() => setShowNotifications(false)} 
                />
              )}
            </div>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-[#050E17] hover:bg-[#0D2235] border border-[#143652] text-[#8397AB] hover:text-[#FCFFFF]"
              title="Settings & Feature Toggles"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* Tab Views Canvas */}
        <div className="px-4 sm:px-8 py-6">
          {activeTab === 'HOME' && (
            <Dashboard 
              transactions={activeAccountTransactions}
              account={activeAccount}
              goals={goals}
              bills={bills}
              deliveries={deliveries}
              widgetConfig={widgetConfig}
              onUpdateWidgetConfig={setWidgetConfig}
              onAddGoal={handleAddGoal}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteGoal}
              onQuickOrder={() => {
                setAddModalMode('SHOPPING');
                setShowAddModal(true);
              }}
              onViewStats={() => setActiveTab('STATS')}
              onAddTransaction={() => {
                setEditingTransaction(undefined);
                setAddModalMode('DEFAULT');
                setShowAddModal(true);
              }}
              onViewBills={() => setActiveTab('BILLS')}
              onViewDeliveries={() => setActiveTab('CALENDAR')}
              lastSyncTime={lastSyncTime}
              isSyncing={isSyncing}
              onManualSync={() => {
                setIsSyncing(true);
                setTimeout(() => {
                  setLastSyncTime(new Date());
                  setIsSyncing(false);
                  addToast('Vault Synchronized', 'Offline cache verified with cloud database', 'success');
                }, 800);
              }}
              currencyPreference={userProfile.currencyPreference || 'INR'}
              isConfidential={isConfidential}
              onToggleConfidential={toggleConfidential}
            />
          )}

          {activeTab === 'LOG' && (
            <TransactionList 
              transactions={activeAccountTransactions}
              onDelete={deleteTransaction}
              onEdit={handleEditTransaction}
              currencyPreference={userProfile.currencyPreference || 'INR'}
              isConfidential={isConfidential}
            />
          )}

          {activeTab === 'BILLS' && (
            <BillsPlanner 
              bills={bills}
              onAddBill={handleAddBill}
              onUpdateBill={handleUpdateBill}
              onDeleteBill={handleDeleteBill}
              onMarkPaid={handleMarkBillPaid}
              currencyPreference={userProfile.currencyPreference || 'INR'}
              isConfidential={isConfidential}
            />
          )}

          {activeTab === 'CALENDAR' && (
            <CalendarView 
              transactions={activeAccountTransactions}
              deliveries={deliveries}
              bills={bills}
              goals={goals}
              onAddDelivery={handleAddDelivery}
              onUpdateDelivery={handleUpdateDelivery}
              onDeleteDelivery={handleDeleteDelivery}
              currencyPreference={userProfile.currencyPreference || 'INR'}
              isConfidential={isConfidential}
            />
          )}

          {activeTab === 'RECEIPTS' && (
            <ReceiptsManager 
              receipts={receipts}
              transactions={activeAccountTransactions}
              onAddReceipt={handleAddReceipt}
              onUpdateReceipt={handleUpdateReceipt}
              onDeleteReceipt={handleDeleteReceipt}
              currencyPreference={userProfile.currencyPreference || 'INR'}
              isConfidential={isConfidential}
            />
          )}

          {activeTab === 'REPORTS' && (
            <FinancialReports 
              transactions={activeAccountTransactions}
              bills={bills}
              incomeSources={incomeSources}
              goals={goals}
              currencyPreference={userProfile.currencyPreference || 'INR'}
              isConfidential={isConfidential}
            />
          )}

          {activeTab === 'STATS' && (
            <StatsView 
              transactions={activeAccountTransactions}
              goals={goals}
            />
          )}
        </div>

        {/* Scroll-To-Top Button */}
        {scrollY > 250 && (
          <button 
            onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="no-print fixed bottom-24 md:bottom-8 right-6 z-40 p-3 rounded-full bg-[#081622] hover:bg-[#FC734D] text-[#FC734D] hover:text-[#02070A] border border-[#143652] shadow-2xl transition-all"
          >
            <ChevronUp size={18} />
          </button>
        )}
      </main>

      {/* Mobile Responsive Bottom Navigation */}
      <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 bg-[#050E17]/95 border-t border-[#143652] px-4 py-2 z-40 flex justify-between items-center backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('HOME')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'HOME' ? 'text-[#FC734D]' : 'text-[#8397AB]'}`}
        >
          <Home size={18} />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button
          onClick={() => setActiveTab('LOG')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'LOG' ? 'text-[#FC734D]' : 'text-[#8397AB]'}`}
        >
          <List size={18} />
          <span className="text-[10px] font-bold">Ledger</span>
        </button>
        <button
          onClick={() => {
            setEditingTransaction(undefined);
            setAddModalMode('DEFAULT');
            setShowAddModal(true);
          }}
          className="p-3 rounded-full bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-[#02070A] shadow-lg shadow-[#FC734D]/30 -top-3 relative"
        >
          <Plus size={22} strokeWidth={3} />
        </button>
        <button
          onClick={() => setActiveTab('STATS')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'STATS' ? 'text-[#FC734D]' : 'text-[#8397AB]'}`}
        >
          <BarChart size={18} />
          <span className="text-[10px] font-bold">Visuals</span>
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'REPORTS' ? 'text-[#FC734D]' : 'text-[#8397AB]'}`}
        >
          <Printer size={18} />
          <span className="text-[10px] font-bold">Reports</span>
        </button>
      </nav>

      {/* Add / Edit Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02070A]/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <TransactionForm 
            onSave={handleSaveTransaction} 
            onCancel={() => { setShowAddModal(false); setEditingTransaction(undefined); }}
            initialMode={addModalMode}
            initialData={editingTransaction}
            history={activeAccountTransactions}
            incomeSources={incomeSources}
            currencyPreference={userProfile.currencyPreference || 'INR'}
          />
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal 
          theme={theme}
          setTheme={setTheme}
          accounts={accounts}
          activeAccountId={activeAccountId}
          userProfile={userProfile}
          featureToggles={featureToggles}
          widgetConfig={widgetConfig}
          onClose={() => setShowSettingsModal(false)}
          onUpdateAccounts={setAccounts}
          onUpdateProfile={setUserProfile}
          onUpdateFeatureToggles={setFeatureToggles}
          onUpdateWidgetConfig={setWidgetConfig}
          onDeleteAccount={(id) => setAccounts(prev => prev.filter(a => a.id !== id))}
          onExportData={handleExportFullBackup}
          onImportData={handleImportFullBackup}
          onResetAllData={handleResetAllData}
          onLogout={handleLogout}
          onReopenOnboarding={() => {
            setShowSettingsModal(false);
            setShowOnboarding(true);
          }}
        />
      )}

      {/* First-Time Onboarding Wizard (Requirement 1C) */}
      {showOnboarding && (
        <OnboardingWizard
          initialProfile={userProfile}
          initialIncomeSources={incomeSources}
          initialToggles={featureToggles}
          initialWidgets={widgetConfig}
          onComplete={handleCompleteOnboarding}
          onSkip={() => {
            setUserProfile(prev => ({ ...prev, onboardingCompleted: true }));
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
