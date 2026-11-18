export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  currencyPreference: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
  biometricPublicKey?: string;
  createdAt: number;
}

export interface OtpRecord {
  id: string;
  userId: string;
  codeHash: string;
  type: string;
  attempts: number;
  expiresAt: number;
  usedAt?: number;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: number;
  revokedAt?: number;
  createdAt: number;
}

export interface AccountRecord {
  id: string;
  name: string;
  type: 'PERSONAL' | 'FAMILY' | 'BUSINESS';
  color: string;
  avatarSeed?: string;
  ownerId: string;
  members: Array<{ userId: string; role: 'OWNER' | 'MEMBER' | 'VIEWER' }>;
  createdAt: number;
}

export interface ShoppingDetailsRecord {
  appName: string;
  productName: string;
  forWhom?: string;
  orderedDate: string;
  deliveryDate?: string;
  status: 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED';
  subItems?: Array<{ name: string; qty: number; price: number }>;
}

export interface TransactionRecord {
  id: string;
  accountId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  mode: 'UPI' | 'CASH' | 'CARD' | 'NET_BANKING' | 'OTHER';
  platform: string;
  purpose: string;
  category: string;
  date: string; // ISO date string
  idempotencyKey?: string;
  shoppingDetails?: ShoppingDetailsRecord;
  createdAt: number;
}

export interface SavingsGoalRecord {
  id: string;
  accountId: string;
  category: string;
  targetAmount: number;
  month: string; // YYYY-MM
  notes?: string;
  createdAt: number;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  category: 'TRANSACTION' | 'DELIVERY' | 'BUDGET' | 'SECURITY' | 'SYSTEM';
  read: boolean;
  createdAt: number;
}

export class DataStore {
  public static users = new Map<string, UserRecord>();
  public static otps = new Map<string, OtpRecord>();
  public static refreshTokens = new Map<string, RefreshTokenRecord>();
  public static accounts = new Map<string, AccountRecord>();
  public static transactions = new Map<string, TransactionRecord>();
  public static goals = new Map<string, SavingsGoalRecord>();
  public static notifications = new Map<string, NotificationRecord>();

  public static clear(): void {
    this.users.clear();
    this.otps.clear();
    this.refreshTokens.clear();
    this.accounts.clear();
    this.transactions.clear();
    this.goals.clear();
    this.notifications.clear();
  }
}
