import React, { useMemo, useState } from 'react';
import { 
  Transaction, 
  TransactionType, 
  Account, 
  SavingsGoal, 
  BillItem, 
  UpcomingDelivery, 
  DashboardWidgetConfig
} from '../types';
import GoalsSection from './GoalsSection';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShoppingBag, 
  Zap, 
  CreditCard, 
  TrendingDown, 
  TrendingUp, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  PieChart as PieIcon, 
  Percent, 
  ShieldCheck,
  Package,
  Clock,
  Layers,
  Eye,
  EyeOff,
  SlidersHorizontal,
  X,
  Plus,
  ExternalLink
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis,
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid 
} from 'recharts';

interface Props {
  transactions: Transaction[];
  account?: Account;
  goals: SavingsGoal[];
  bills?: BillItem[];
  deliveries?: UpcomingDelivery[];
  widgetConfig?: DashboardWidgetConfig;
  onUpdateWidgetConfig?: (cfg: DashboardWidgetConfig) => void;
  onAddGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  onUpdateGoal: (id: string, updates: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>) => void;
  onDeleteGoal: (id: string) => void;
  onQuickOrder: () => void;
  onViewStats: () => void;
  onAddTransaction?: () => void;
  onViewBills?: () => void;
  onViewDeliveries?: () => void;
  lastSyncTime?: Date | null;
  isSyncing?: boolean;
  onManualSync?: () => void;
  currencyPreference?: string;
  isConfidential?: boolean;
  onToggleConfidential?: () => void;
}

const DEFAULT_WIDGETS: DashboardWidgetConfig = {
  totalBalance: true,
  monthlyIncome: true,
  monthlyExpenses: true,
  remainingBudget: true,
  savingsProgress: true,
  upcomingBills: true,
  upcomingDeliveries: true,
  recentTransactions: true,
  monthlySpendingChart: true,
  incomeVsExpenseChart: true,
  financialInsights: true,
};

const CHART_COLORS = ['#FC734D', '#0297DE', '#22C58B', '#38BDF8', '#818CF8', '#C084FC', '#FBBF24'];

const Dashboard: React.FC<Props> = ({ 
  transactions, 
  account, 
  goals,
  bills = [],
  deliveries = [],
  widgetConfig = DEFAULT_WIDGETS,
  onUpdateWidgetConfig,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onQuickOrder, 
  onViewStats,
  onAddTransaction,
  onViewBills,
  onViewDeliveries,
  lastSyncTime,
  isSyncing,
  onManualSync,
  currencyPreference = 'INR',
  isConfidential = false,
  onToggleConfidential
}) => {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D'>('7D');
  const [showWidgetCustomizer, setShowWidgetCustomizer] = useState(false);

  const stats = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) {
        acc.income += t.amount;
      } else {
        acc.expense += t.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [transactions]);

  const balance = stats.income - stats.expense;
  const recentTx = transactions.slice(0, 5);

  const savingsRate = stats.income > 0 
    ? Math.max(0, Math.round(((stats.income - stats.expense) / stats.income) * 100))
    : 0;

  // Monthly remaining budget calculation
  const totalBudgetLimit = useMemo(() => {
    return goals.reduce((sum, g) => sum + g.targetAmount, 0) || 60000;
  }, [goals]);

  const remainingBudget = Math.max(0, totalBudgetLimit - stats.expense);

  // Cash flow trend for chart
  const cashFlowTrend = useMemo(() => {
    const data = [];
    const daysToSubtract = timeRange === '7D' ? 6 : timeRange === '30D' ? 29 : 89;
    
    for (let i = daysToSubtract; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayName = timeRange === '7D' 
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayTx = transactions.filter(t => t.date === dateStr);
      const income = dayTx.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
      const expense = dayTx.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
          
      data.push({ name: dayName, income, expense, amount: expense, fullDate: dateStr });
    }
    return data;
  }, [transactions, timeRange]);

  // Upcoming bills due soon
  const pendingBills = useMemo(() => {
    return bills.filter(b => b.status === 'PENDING').slice(0, 3);
  }, [bills]);

  // Active deliveries in transit
  const activeDeliveries = useMemo(() => {
    return deliveries.filter(d => d.status !== 'DELIVERED' && d.status !== 'RETURNED').slice(0, 3);
  }, [deliveries]);

  const toggleWidget = (key: keyof DashboardWidgetConfig) => {
    if (onUpdateWidgetConfig) {
      onUpdateWidgetConfig({
        ...widgetConfig,
        [key]: !widgetConfig[key]
      });
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in duration-500">
      {/* Top Welcome & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#143652]">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#FCFFFF] flex items-center gap-2">
            Welcome back, <span className="text-[#FC734D]">{account?.name || 'Explorer'}</span> 👋
          </h2>
          <p className="text-xs text-[#8397AB] mt-0.5">
            Private fintech ledger • Encrypted on device • Zero forced bank debits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Privacy Toggle */}
          {onToggleConfidential && (
            <button
              onClick={onToggleConfidential}
              title={isConfidential ? 'Show amounts' : 'Mask confidential amounts'}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                isConfidential
                  ? 'bg-[#FC734D] text-[#02070A] border-[#FC734D]'
                  : 'bg-[#050E17] text-[#8397AB] hover:text-[#FCFFFF] border-[#143652]'
              }`}
            >
              {isConfidential ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="hidden sm:inline">Privacy</span>
            </button>
          )}

          {/* Customize Widgets Button */}
          <button
            onClick={() => setShowWidgetCustomizer(true)}
            className="px-3 py-1.5 rounded-xl bg-[#050E17] hover:bg-[#0D2235] border border-[#143652] text-xs font-bold text-[#0297DE] flex items-center gap-1.5 transition-colors"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Customize</span>
          </button>

          {/* Sync Button */}
          <button 
            onClick={onManualSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl bg-[#081622] hover:bg-[#0D2235] border border-[#143652] text-xs font-semibold text-[#8397AB] hover:text-[#FCFFFF] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin text-[#0297DE]" : "text-[#8397AB]"} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <span className="px-3 py-1.5 rounded-xl bg-[#0297DE]/15 border border-[#0297DE]/30 text-[#0297DE] text-xs font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0297DE] animate-pulse"></span>
            Cloud Vault
          </span>
        </div>
      </div>

      {/* KPI Cards Row (Configurable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Widget 1: Total Balance */}
        {widgetConfig.totalBalance && (
          <div className="dashboard-card glass-card p-5 border border-[#143652] relative overflow-hidden bg-gradient-to-br from-[#081622] to-[#0D2235]">
            <div className="flex justify-between items-center text-xs text-[#8397AB] font-bold uppercase tracking-wider">
              <span>Liquid Net Balance</span>
              <Wallet className="w-4 h-4 text-[#FC734D]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#FCFFFF] mt-2">
              {formatCurrency(balance, currencyPreference, isConfidential)}
            </div>
            <div className="text-xs text-[#0297DE] font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {savingsRate}% monthly net savings rate
            </div>
          </div>
        )}

        {/* Widget 2: Monthly Income */}
        {widgetConfig.monthlyIncome && (
          <div className="dashboard-card glass-card p-5 border border-[#143652] bg-[#081622]">
            <div className="flex justify-between items-center text-xs text-[#8397AB] font-bold uppercase tracking-wider">
              <span>Monthly Inflow</span>
              <ArrowDownRight className="w-4 h-4 text-[#0297DE]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0297DE] mt-2">
              {formatCurrency(stats.income, currencyPreference, isConfidential)}
            </div>
            <div className="text-xs text-[#8397AB] mt-1">
              Recorded credits this month
            </div>
          </div>
        )}

        {/* Widget 3: Monthly Expenses */}
        {widgetConfig.monthlyExpenses && (
          <div className="dashboard-card glass-card p-5 border border-[#143652] bg-[#081622]">
            <div className="flex justify-between items-center text-xs text-[#8397AB] font-bold uppercase tracking-wider">
              <span>Monthly Outflow</span>
              <ArrowUpRight className="w-4 h-4 text-[#FC734D]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#FC734D] mt-2">
              {formatCurrency(stats.expense, currencyPreference, isConfidential)}
            </div>
            <div className="text-xs text-[#8397AB] mt-1">
              Debit purchases & bills
            </div>
          </div>
        )}

        {/* Widget 4: Net Cash Flow */}
        {(widgetConfig.remainingBudget || widgetConfig.netSavings) && (
          <div className="dashboard-card glass-card p-5 border border-[#143652] bg-[#081622]">
            <div className="flex justify-between items-center text-xs text-[#8397AB] font-bold uppercase tracking-wider">
              <span>Net Cash Flow</span>
              <Sparkles className="w-4 h-4 text-[#22C58B]" />
            </div>
            <div className={`text-2xl sm:text-3xl font-black mt-2 ${balance >= 0 ? 'text-[#22C58B]' : 'text-[#FC734D]'}`}>
              {balance >= 0 ? '+' : ''}{formatCurrency(balance, currencyPreference, isConfidential)}
            </div>
            <div className="text-xs text-[#8397AB] mt-1">
              Monthly Savings Rate: {savingsRate}%
            </div>
          </div>
        )}
      </div>

      {/* Charts Row: Monthly Spending Trend & Inflow vs Outflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Spending Chart (2 Cols) */}
        {widgetConfig.monthlySpendingChart && (
          <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-[#143652] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#FCFFFF] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#FC734D]" />
                  Monthly Spending & Cash Flow Trend
                </h3>
                <p className="text-xs text-[#8397AB]">Daily spending velocity against time</p>
              </div>

              <div className="flex bg-[#050E17] p-1 rounded-xl border border-[#143652] self-start sm:self-center">
                {(['7D', '30D', '90D'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      timeRange === r ? 'bg-[#FC734D] text-[#02070A] shadow-sm' : 'text-[#8397AB] hover:text-[#FCFFFF]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowTrend}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FC734D" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#FC734D" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0297DE" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0297DE" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#143652" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#8397AB" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8397AB" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#081622', borderColor: '#143652', borderRadius: '12px' }}
                    formatter={(val: any) => [formatCurrency(Number(val) || 0, currencyPreference, isConfidential), '']}
                  />
                  <Area type="monotone" dataKey="income" stroke="#0297DE" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" stroke="#FC734D" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Income vs Expense Comparison */}
        {widgetConfig.incomeVsExpenseChart && (
          <div className="glass-card p-6 rounded-3xl border border-[#143652] space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#FCFFFF] flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#0297DE]" />
                Inflow vs Outflow
              </h3>
              <p className="text-xs text-[#8397AB]">Direct cash flow comparison</p>
            </div>

            <div className="space-y-4 my-auto">
              <div className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#0297DE]">Income Credited</span>
                  <span className="font-black text-[#FCFFFF]">
                    {formatCurrency(stats.income, currencyPreference, isConfidential)}
                  </span>
                </div>
                <div className="w-full bg-[#081622] h-2.5 rounded-full overflow-hidden">
                  <div className="bg-[#0297DE] h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#FC734D]">Expenses Debited</span>
                  <span className="font-black text-[#FCFFFF]">
                    {formatCurrency(stats.expense, currencyPreference, isConfidential)}
                  </span>
                </div>
                <div className="w-full bg-[#081622] h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#FC734D] h-full rounded-full" 
                    style={{ width: `${stats.income > 0 ? Math.min(100, (stats.expense / stats.income) * 100) : 0}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#050E17] border border-[#143652] text-center">
              <span className="text-[11px] text-[#8397AB] block">Net Operating Cash Flow</span>
              <span className={`text-xl font-black mt-0.5 block ${balance >= 0 ? 'text-[#22C58B]' : 'text-[#FC734D]'}`}>
                {balance >= 0 ? '+' : ''}{formatCurrency(balance, currencyPreference, isConfidential)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Row: Upcoming Bills & Upcoming Deliveries (Separated Box) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Bills Box */}
        {widgetConfig.upcomingBills && (
          <div className="glass-card p-6 rounded-3xl border border-[#143652] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#143652]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h4 className="font-extrabold text-sm text-[#FCFFFF]">Upcoming Bills to Pay (Manual)</h4>
              </div>
              {onViewBills && (
                <button
                  onClick={onViewBills}
                  className="text-xs text-[#FC734D] hover:underline font-bold"
                >
                  View All Bills →
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {pendingBills.length === 0 ? (
                <p className="text-xs text-[#8397AB] py-4 text-center">No pending bills due soon.</p>
              ) : (
                pendingBills.map(b => (
                  <div key={b.id} className="p-3 rounded-2xl bg-[#050E17] border border-[#143652] flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-[#FCFFFF]">{b.name}</p>
                      <span className="text-[10px] text-amber-400 font-semibold">Due {formatDate(b.dueDate)}</span>
                    </div>
                    <span className="font-black text-[#FC734D]">
                      {formatCurrency(b.amount, currencyPreference, isConfidential)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Separate Upcoming Deliveries Box */}
        {widgetConfig.upcomingDeliveries && (
          <div className="glass-card p-6 rounded-3xl border border-[#143652] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#143652]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0297DE]" />
                <h4 className="font-extrabold text-sm text-[#FCFFFF]">Upcoming Deliveries Box (Separated)</h4>
              </div>
              {onViewDeliveries && (
                <button
                  onClick={onViewDeliveries}
                  className="text-xs text-[#0297DE] hover:underline font-bold"
                >
                  Manage Deliveries →
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {activeDeliveries.length === 0 ? (
                <p className="text-xs text-[#8397AB] py-4 text-center">No package deliveries in transit.</p>
              ) : (
                activeDeliveries.map(d => (
                  <div key={d.id} className="p-3 rounded-2xl bg-[#050E17] border border-[#143652] flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-[#FCFFFF]">{d.name}</p>
                      <span className="text-[10px] text-[#0297DE] font-semibold">{d.carrier} • Expected {formatDate(d.expectedDate)}</span>
                    </div>
                    <span className="font-black text-[#0297DE]">
                      {d.estimatedAmount ? formatCurrency(d.estimatedAmount, currencyPreference, isConfidential) : d.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Row: Recent Transactions with Sentence Notes & Financial Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List (2 Cols) */}
        {widgetConfig.recentTransactions && (
          <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-[#143652] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#143652]">
              <h4 className="font-extrabold text-sm text-[#FCFFFF]">Recent Activity with Personal Notes</h4>
              {onAddTransaction && (
                <button
                  onClick={onAddTransaction}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-[#02070A] text-xs font-black shadow-sm flex items-center gap-1"
                >
                  <Plus size={13} strokeWidth={3} />
                  Record Expense
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {recentTx.length === 0 ? (
                <p className="text-xs text-[#8397AB] py-6 text-center">No transactions recorded yet.</p>
              ) : (
                recentTx.map(t => {
                  const isIncome = t.type === TransactionType.INCOME;
                  return (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-[#050E17] border border-[#143652] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isIncome ? 'bg-[#0297DE]/15 text-[#0297DE]' : 'bg-[#FC734D]/15 text-[#FC734D]'}`}>
                          {isIncome ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div>
                          <p className="font-bold text-[#FCFFFF]">{t.purpose}</p>
                          {t.description && (
                            <p className="text-[11px] text-[#8397AB] italic">
                              "{t.description}"
                            </p>
                          )}
                          <span className="text-[10px] text-[#8397AB]">
                            {formatDate(t.date)} • {t.category} • {t.mode}
                          </span>
                        </div>
                      </div>

                      <span className={`font-black font-mono text-sm self-end sm:self-center ${isIncome ? 'text-[#0297DE]' : 'text-[#FC734D]'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(t.amount, currencyPreference, isConfidential)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Financial Insights Card */}
        {widgetConfig.financialInsights && (
          <div className="glass-card p-6 rounded-3xl border border-[#143652] space-y-4 flex flex-col justify-between">
            <div>
              <h4 className="font-extrabold text-sm text-[#FCFFFF] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FC734D]" />
                Financial Insights & Rules
              </h4>
              <p className="text-xs text-[#8397AB] mt-0.5">Automated cash health heuristics</p>
            </div>

            <div className="space-y-3 my-auto">
              <div className="p-3 rounded-2xl bg-[#050E17] border border-[#143652] text-xs">
                <span className="font-bold text-[#FC734D] block mb-1">Savings Margin</span>
                <p className="text-[11px] text-[#8397AB]">
                  {savingsRate > 0 
                    ? `Healthy ${savingsRate}% savings rate maintained across recorded monthly inflows.` 
                    : `Net cash flow is ${balance >= 0 ? 'balanced' : 'in negative outflow'} for this billing period.`}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#050E17] border border-[#143652] text-xs">
                <span className="font-bold text-[#0297DE] block mb-1">Multi-Income Sovereignty</span>
                <p className="text-[11px] text-[#8397AB]">
                  Tracking multiple streams protects against single points of income failure.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#050E17] border border-[#143652] text-xs">
                <span className="font-bold text-[#22C58B] block mb-1">Zero Forced Debits</span>
                <p className="text-[11px] text-[#8397AB]">
                  Manual bill approvals give you full control of your cash timing.
                </p>
              </div>
            </div>

            <button
              onClick={onViewStats}
              className="w-full py-2.5 rounded-xl bg-[#050E17] hover:bg-[#0D2235] border border-[#143652] text-xs font-bold text-[#FCFFFF] transition-colors"
            >
              Open Complete Analytics
            </button>
          </div>
        )}
      </div>

      {/* Savings Progress / Goals Section */}
      {widgetConfig.savingsProgress && (
        <GoalsSection 
          goals={goals}
          transactions={transactions}
          activeAccountId={account?.id || 'default'}
          onAddGoal={onAddGoal}
          onUpdateGoal={onUpdateGoal}
          onDeleteGoal={onDeleteGoal}
        />
      )}

      {/* Customizable Dashboard Widgets Drawer / Modal */}
      {showWidgetCustomizer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02070A]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#081622] border border-[#143652] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#143652]">
              <h3 className="text-base font-extrabold text-[#FCFFFF] flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-[#0297DE]" />
                Personalize Dashboard Widgets
              </h3>
              <button onClick={() => setShowWidgetCustomizer(false)} className="text-[#8397AB] hover:text-[#FCFFFF]">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#8397AB]">
              Toggle visibility for individual widgets. Your layout preferences are preserved.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {Object.entries(widgetConfig).map(([key, isVisible]) => (
                <label key={key} className="flex items-center justify-between p-3 rounded-xl bg-[#050E17] border border-[#143652] cursor-pointer">
                  <span className="text-xs font-bold text-[#FCFFFF] capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleWidget(key as keyof DashboardWidgetConfig)}
                    className="w-4 h-4 text-[#FC734D] rounded"
                  />
                </label>
              ))}
            </div>

            <div className="pt-2 border-t border-[#143652] flex justify-end">
              <button
                onClick={() => setShowWidgetCustomizer(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-xs font-black text-[#02070A]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
