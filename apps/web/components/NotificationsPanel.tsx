import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, SavingsGoal } from '../types';
import { X, AlertTriangle, Package, Wallet, ShieldCheck, Bell, Check, CheckCheck, Trash2, BellRing, Sparkles } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  category: 'ALL' | 'ORDERS' | 'BUDGETS' | 'SECURITY';
  time: string;
  read: boolean;
  icon: React.ReactNode;
}

interface Props {
  transactions: Transaction[];
  goals?: SavingsGoal[];
  onClose: () => void;
  onActionClick?: (type: string) => void;
}

const NotificationsPanel: React.FC<Props> = ({ transactions, goals = [], onClose, onActionClick }) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'ORDERS' | 'BUDGETS' | 'SECURITY'>('ALL');
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [clearedIds, setClearedIds] = useState<Set<string>>(() => new Set());
  const [permissionStatus, setPermissionStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Generate dynamic, intelligent notifications from real app state
  const rawNotifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Security Alert: Active session & Argon2id protection
    list.push({
      id: 'sec-1',
      title: 'Session Secured',
      message: 'Active session encrypted with Argon2id and RS256 token rotation.',
      type: 'info',
      category: 'SECURITY',
      time: 'Just now',
      read: readIds.has('sec-1'),
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />
    });

    // 2. Pending Deliveries (Quick-Commerce & E-Commerce)
    const activeDeliveries = transactions.filter(
      t => t.shoppingDetails && (t.shoppingDetails.status === 'ORDERED' || t.shoppingDetails.status === 'SHIPPED')
    );

    if (activeDeliveries.length > 0) {
      const topApp = activeDeliveries[0].shoppingDetails?.appName || 'Online Store';
      const topItem = activeDeliveries[0].shoppingDetails?.productName || 'Order Package';
      list.push({
        id: 'del-1',
        title: `Active Delivery: ${topApp}`,
        message: `${topItem} is on its way. Estimated arrival updated.`,
        type: 'warning',
        category: 'ORDERS',
        time: '12m ago',
        read: readIds.has('del-1'),
        icon: <Package className="w-4 h-4 text-amber-400" />
      });
    }

    // 3. Category Savings Goal Budget Alerts
    goals.forEach(goal => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const spent = transactions
        .filter(t => t.type === TransactionType.EXPENSE && t.category.toLowerCase() === goal.category.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);

      const percent = goal.targetAmount > 0 ? (spent / goal.targetAmount) * 100 : 0;

      if (percent >= 100) {
        list.push({
          id: `goal-over-${goal.id}`,
          title: `Budget Breached: ${goal.category}`,
          message: `Spent ₹${spent.toLocaleString()} / ₹${goal.targetAmount.toLocaleString()} (${Math.round(percent)}%). Limit exceeded!`,
          type: 'danger',
          category: 'BUDGETS',
          time: 'Today',
          read: readIds.has(`goal-over-${goal.id}`),
          icon: <AlertTriangle className="w-4 h-4 text-rose-500" />
        });
      } else if (percent >= 70) {
        list.push({
          id: `goal-warn-${goal.id}`,
          title: `Budget Warning: ${goal.category}`,
          message: `Spent ₹${spent.toLocaleString()} / ₹${goal.targetAmount.toLocaleString()} (${Math.round(percent)}%). Reaching threshold buffer.`,
          type: 'warning',
          category: 'BUDGETS',
          time: 'Today',
          read: readIds.has(`goal-warn-${goal.id}`),
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />
        });
      }
    });

    // 4. Daily Spending Summary
    const todayExpenses = transactions
      .filter(t => t.date === todayStr && t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    if (todayExpenses > 0) {
      list.push({
        id: 'daily-sum',
        title: 'Daily Spending Tracker',
        message: `Total outflow today: ₹${todayExpenses.toLocaleString()} recorded.`,
        type: 'info',
        category: 'ALL',
        time: 'Today',
        read: readIds.has('daily-sum'),
        icon: <Wallet className="w-4 h-4 text-blue-400" />
      });
    }

    return list;
  }, [transactions, goals, readIds]);

  // Filter list
  const filteredNotifications = rawNotifications
    .filter(n => !clearedIds.has(n.id))
    .filter(n => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'UNREAD') return !n.read;
      if (activeFilter === 'ORDERS') return n.category === 'ORDERS';
      if (activeFilter === 'BUDGETS') return n.category === 'BUDGETS';
      if (activeFilter === 'SECURITY') return n.category === 'SECURITY';
      return true;
    });

  const unreadCount = rawNotifications.filter(n => !clearedIds.has(n.id) && !n.read).length;

  const handleMarkAllRead = () => {
    const allIds = new Set(readIds);
    rawNotifications.forEach(n => allIds.add(n.id));
    setReadIds(allIds);
  };

  const handleClearAll = () => {
    const allIds = new Set(clearedIds);
    rawNotifications.forEach(n => allIds.add(n.id));
    setClearedIds(allIds);
  };

  const handleRequestPush = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      setPermissionStatus(res);
      if (res === 'granted') {
        new Notification("Let's Track It", {
          body: 'Push notifications activated! You will receive live delivery and budget alerts.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  return (
    <div className="absolute top-14 right-0 w-84 md:w-96 glass-card bg-[#171F44]/95 border border-[#74FFED]/25 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[#0C1126]/60 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#74FFED]/15 rounded-xl text-[#74FFED] border border-[#74FFED]/30">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-[#74FFED] text-[#171F44] text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">
                  {unreadCount}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-[var(--text-muted)]">Live Deliveries & Budget Alerts</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Browser Notification Activation Banner */}
      {permissionStatus !== 'granted' && (
        <div className="px-4 py-2.5 bg-[#74FFED]/10 border-b border-[#74FFED]/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-[#74FFED]">
            <BellRing className="w-3.5 h-3.5 shrink-0" />
            <span>Enable system desktop alerts</span>
          </div>
          <button
            onClick={handleRequestPush}
            className="text-[10px] font-bold bg-[#74FFED] text-[#171F44] px-2.5 py-1 rounded-lg hover:bg-[#5CE6D4] transition-colors"
          >
            Allow
          </button>
        </div>
      )}

      {/* Filter Category Pills */}
      <div className="flex px-3 py-2 gap-1.5 border-b border-[var(--border-color)] overflow-x-auto custom-scrollbar bg-[#0C1126]/40">
        {[
          { key: 'ALL', label: 'All' },
          { key: 'UNREAD', label: `Unread (${unreadCount})` },
          { key: 'ORDERS', label: 'Orders' },
          { key: 'BUDGETS', label: 'Budgets' },
          { key: 'SECURITY', label: 'Security' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as any)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors shrink-0 ${
              activeFilter === tab.key
                ? 'bg-[#74FFED] text-[#171F44] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-secondary)]/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification Items List */}
      <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {filteredNotifications.map(item => (
          <div
            key={item.id}
            onClick={() => {
              const updated = new Set(readIds);
              updated.add(item.id);
              setReadIds(updated);
            }}
            className={`p-3 rounded-2xl transition-all cursor-pointer border ${
              item.read
                ? 'bg-[var(--bg-card)]/50 border-transparent opacity-70 hover:opacity-100 hover:bg-[var(--bg-secondary)]/40'
                : 'bg-[var(--bg-secondary)]/70 border-[#74FFED]/25 hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-xs font-bold text-[var(--text-main)] truncate">{item.title}</h4>
                  <span className="text-[9px] font-medium text-[var(--text-muted)] shrink-0">{item.time}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{item.message}</p>
              </div>
              {!item.read && (
                <div className="w-2 h-2 rounded-full bg-[#74FFED] shadow-[0_0_8px_#74FFED] shrink-0 mt-1.5" />
              )}
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="py-12 text-center text-[var(--text-muted)] text-xs space-y-2">
            <Check className="w-6 h-6 mx-auto text-[#22C58B] opacity-70" />
            <p className="font-medium text-[var(--text-main)]">All caught up!</p>
            <p className="text-[11px] text-[var(--text-muted)]">No active notifications in this category.</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[#0C1126]/50 flex justify-between items-center text-xs">
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-1.5 font-bold text-[var(--text-muted)] hover:text-[#74FFED] transition-colors text-[11px]"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark all read</span>
        </button>
        <button
          onClick={handleClearAll}
          className="flex items-center gap-1.5 font-bold text-[var(--text-muted)] hover:text-[#FC734D] transition-colors text-[11px]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear all</span>
        </button>
      </div>
    </div>
  );
};

export default NotificationsPanel;