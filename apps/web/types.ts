export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum PaymentMode {
  UPI = 'UPI',
  CASH = 'CASH',
  CARD = 'CARD',
  NET_BANKING = 'NET_BANKING',
  OTHER = 'OTHER'
}

export enum Category {
  FOOD = 'FOOD',
  GROCERY = 'GROCERY',
  SHOPPING = 'SHOPPING',
  ELECTRONICS = 'ELECTRONICS',
  TRAVEL = 'TRAVEL',
  BILLS = 'BILLS',
  ENTERTAINMENT = 'ENTERTAINMENT',
  HEALTH = 'HEALTH',
  INCOME = 'INCOME',
  OTHERS = 'OTHERS'
}

export interface ShoppingDetails {
  appName: string;
  productName: string;
  forWhom: string;
  orderedDate: string; // ISO Date string
  deliveryDate: string; // ISO Date string
  status: 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED';
}

export interface Transaction {
  id: string;
  accountId: string; // Linked Account
  date: string; // ISO Date string
  amount: number;
  type: TransactionType;
  mode: PaymentMode;
  platform: string; // e.g., "GPay", "PhonePe", "Offline", "Amazon"
  purpose: string;
  description?: string; // Sentence or personal note: e.g. "Bought groceries for the week at the supermarket"
  category: Category;
  tags?: string[];
  receiptUrl?: string; // Attachment URL or base64
  receiptId?: string; // Linked receipt ID
  incomeSourceId?: string; // Multiple income source linkage
  incomeSource?: string; // e.g. "Salary", "Freelance", "Consulting", "Investments"
  isRecurring?: boolean;
  amortizationId?: string; // Optional link to amortization plan
  shoppingDetails?: ShoppingDetails;
  createdAt: number;
}

// Dedicated Delivery Entry for the Separate Upcoming Deliveries Panel
export interface UpcomingDelivery {
  id: string;
  accountId: string;
  name: string; // Delivery / item name
  orderNumber?: string; // Order or reference ID
  expectedDate: string; // YYYY-MM-DD
  estimatedAmount: number;
  status: 'ORDERED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED';
  carrier?: string; // e.g. Amazon, Bluedart, FedEx, Zepto, Blinkit
  notes?: string;
  createdAt: number;
}

// Dedicated Bills & Payment Planner Entry
export interface BillItem {
  id: string;
  accountId: string;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: string;
  recurrence: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  status: 'PENDING' | 'OVERDUE' | 'PAID';
  reminderDaysBefore: number; // e.g. 0, 1, 3, 7
  notes?: string;
  paidDate?: string;
  paymentMethod?: string;
  createdAt: number;
}

// Multiple Income Sources within the same month
export interface IncomeSource {
  id: string;
  accountId: string;
  name: string; // e.g. "Primary Tech Job", "Freelance Design", "Stock Dividends"
  amount: number;
  date: string; // YYYY-MM-DD
  category: string; // "Salary", "Freelance", "Business", "Investments", "Rental", "Other"
  description?: string;
  isRecurring: boolean;
  recurrenceFrequency?: 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'ONE_TIME';
  createdAt: number;
}

// Variable Expense Trackers (e.g. Groceries, Transportation, Dining, Shopping)
export interface VariableExpenseSheet {
  id: string;
  accountId: string;
  name: string; // e.g. "Groceries Tracker", "Fuel & Commute", "Weekend Dining"
  category: string; // Category matched from transactions (e.g. "GROCERY")
  monthlyBudget: number;
  color?: string;
  icon?: string;
  notes?: string;
  createdAt: number;
}

// Confidential Online Envelope Budget Planner
export interface EnvelopeBudget {
  id: string;
  accountId: string;
  month: string; // YYYY-MM
  category: string;
  allocatedAmount: number; // Planned allocation
  rolloverAmount: number; // Rollover amount from previous cycle
  spendingLimit: number; // Hard cap
  allowRollover: boolean;
  notes?: string;
}

// Receipt & Document Organizer
export interface ReceiptSplit {
  category: string;
  amount: number;
  notes?: string;
}

export interface ReceiptDocument {
  id: string;
  accountId: string;
  title: string;
  merchant: string;
  transactionDate: string;
  amount: number;
  category: string;
  tags: string[];
  personalNotes?: string;
  fileUrl: string; // Data URL or storage path
  fileName: string;
  fileType: 'IMAGE' | 'PDF' | 'INVOICE' | 'RECEIPT' | 'OTHER';
  fileSize?: number;
  relatedTransactionId?: string;
  splits?: ReceiptSplit[]; // Single receipt split across multiple budget categories
  createdAt: number;
}

// Income & Expense Amortization
export interface AmortizationPlan {
  id: string;
  accountId: string;
  title: string; // e.g. "Annual Auto Insurance", "Annual Software License", "Yearly Bonus"
  type: TransactionType;
  originalAmount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  months: number; // e.g. 12
  monthlyAllocatedAmount: number;
  remainingAllocation: number;
  category: string;
  notes?: string;
  relatedTransactionId?: string;
  createdAt: number;
}

export interface FeatureToggles {
  manualTrackingOnly: boolean;
  envelopeBudgeting?: boolean;
  billsTracker: boolean;
  savingsGoals: boolean;
  spendingInsights: boolean;
  alertsAndNotifications: boolean;
  sharedBudgets: boolean;
  simpleMode: boolean; // Simple vs Advanced mode
  confidentialPrivacyMode: boolean; // Mask balances and sensitive numbers
  biometricLock: boolean;
}

export interface DashboardWidgetConfig {
  totalBalance: boolean;
  monthlyIncome: boolean;
  monthlyExpenses: boolean;
  remainingBudget?: boolean;
  netSavings?: boolean;
  savingsProgress: boolean;
  upcomingBills: boolean;
  upcomingDeliveries: boolean;
  recentTransactions: boolean;
  monthlySpendingChart: boolean;
  incomeVsExpenseChart: boolean;
  financialInsights: boolean;
}

export interface SavingsGoal {
  id: string;
  accountId: string;
  category: string; // e.g., 'Groceries', 'Electronics', 'Food', etc.
  targetAmount: number; // Monthly spending limit or target savings budget
  month: string; // YYYY-MM
  notes?: string;
  createdAt: number;
}

export interface Account {
    id: string;
    name: string;
    type: 'PERSONAL' | 'FAMILY' | 'BUSINESS';
    color: string;
    avatarSeed: string;
    budgets?: Record<string, number>; // Category name -> Amount limit
}

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  shoppingCount: number;
}

export interface UserProfile {
    name: string;
    email: string;
    phone: string;
    isVerified: boolean;
    avatarSeed?: string;
    currencyPreference?: string; // INR, USD, EUR, GBP, etc.
    monthlyIncome?: number;
    employmentStatus?: string; // Employed, Freelancer, Business, Student, Other
    monthlyBudget?: number;
    financialGoals?: string[];
    onboardingCompleted?: boolean;
    trackingPreferences?: FeatureToggles;
}

export interface AISettings {
    persona: 'PROFESSIONAL' | 'FRIENDLY' | 'STRICT' | 'FUNNY';
    monthlyBudgetAlert: boolean;
    autoCategorize: boolean;
}

export interface Suggestion {
  id: string;
  title: string;
  message: string;
  type: 'SAVING' | 'ALERT' | 'HABIT' | 'KUDOS';
  action: string; // Short action text like "Review Subscriptions"
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  modelUsed?: string;
  retrievedChunks?: Array<{
    contentType: string;
    text: string;
    similarity: number;
  }>;
}

export type ChatRolePreset = 'COACH' | 'AUDITOR' | 'PLANNER' | 'FRUGAL';

export interface ChatBotRoleConfig {
  id: ChatRolePreset;
  name: string;
  tagline: string;
  systemInstruction: string;
  defaultModel: 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview';
  badge: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  category: 'TRANSACTION' | 'DELIVERY' | 'BUDGET' | 'SECURITY' | 'SYSTEM';
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  duration?: number;
}

export interface AppData {
    version: number;
    profile: UserProfile;
    accounts: Account[];
    transactions: Transaction[];
    goals?: SavingsGoal[];
    deliveries?: UpcomingDelivery[];
    bills?: BillItem[];
    incomeSources?: IncomeSource[];
    expenseSheets?: VariableExpenseSheet[];
    envelopeBudgets?: EnvelopeBudget[];
    receipts?: ReceiptDocument[];
    amortizations?: AmortizationPlan[];
    featureToggles?: FeatureToggles;
    widgetConfig?: DashboardWidgetConfig;
    aiSettings?: AISettings;
}