import React, { useState, useMemo } from 'react';
import { BillItem } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  X, 
  Bell, 
  Search, 
  RotateCcw,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';

interface Props {
  bills: BillItem[];
  onAddBill: (bill: Omit<BillItem, 'id' | 'createdAt'>) => void;
  onUpdateBill: (id: string, updates: Partial<BillItem>) => void;
  onDeleteBill: (id: string) => void;
  onMarkPaid: (bill: BillItem) => void;
  currencyPreference?: string;
  isConfidential?: boolean;
}

export const BillsPlanner: React.FC<Props> = ({
  bills,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onMarkPaid,
  currencyPreference = 'INR',
  isConfidential = false
}) => {
  const [tab, setTab] = useState<'UPCOMING' | 'OVERDUE' | 'PAID' | 'ALL'>('UPCOMING');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Utilities');
  const [recurrence, setRecurrence] = useState<BillItem['recurrence']>('MONTHLY');
  const [reminderDays, setReminderDays] = useState<number>(3);
  const [notes, setNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Process status (Pending vs Overdue vs Paid)
  const evaluatedBills = useMemo(() => {
    return bills.map(b => {
      let status = b.status;
      if (status !== 'PAID') {
        if (b.dueDate < todayStr) {
          status = 'OVERDUE';
        } else {
          status = 'PENDING';
        }
      }
      return { ...b, status };
    });
  }, [bills, todayStr]);

  const upcomingBills = evaluatedBills.filter(b => b.status === 'PENDING');
  const overdueBills = evaluatedBills.filter(b => b.status === 'OVERDUE');
  const paidBills = evaluatedBills.filter(b => b.status === 'PAID');

  const totalUpcomingObligations = upcomingBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const totalOverdueAmount = overdueBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const totalPaidThisCycle = paidBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const displayedBills = evaluatedBills.filter(b => {
    const matchesTab =
      tab === 'ALL' ? true :
      tab === 'UPCOMING' ? b.status === 'PENDING' :
      tab === 'OVERDUE' ? b.status === 'OVERDUE' :
      b.status === 'PAID';

    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase()) ||
      (b.notes && b.notes.toLowerCase().includes(search.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setCategory('Utilities');
    setRecurrence('MONTHLY');
    setReminderDays(3);
    setNotes('');
    setShowModal(true);
  };

  const openEdit = (b: BillItem) => {
    setEditingId(b.id);
    setName(b.name);
    setAmount(b.amount.toString());
    setDueDate(b.dueDate);
    setCategory(b.category);
    setRecurrence(b.recurrence);
    setReminderDays(b.reminderDaysBefore);
    setNotes(b.notes || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    const payload = {
      accountId: 'default',
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      dueDate,
      category,
      recurrence,
      status: 'PENDING' as const,
      reminderDaysBefore: reminderDays,
      notes: notes.trim() || undefined
    };

    if (editingId) {
      onUpdateBill(editingId, payload);
    } else {
      onAddBill(payload);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[#081622] border border-[#143652] relative overflow-hidden">
          <div className="flex justify-between items-center text-xs text-[#8397AB] font-bold uppercase tracking-wider">
            <span>Upcoming Manual Obligations</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 mt-2">
            {formatCurrency(totalUpcomingObligations, currencyPreference, isConfidential)}
          </div>
          <div className="text-xs text-[#8397AB] mt-1">
            {upcomingBills.length} bill{upcomingBills.length !== 1 ? 's' : ''} to pay manually
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#081622] border border-[#143652]">
          <div className="flex justify-between items-center text-xs text-[#8397AB] font-bold uppercase tracking-wider">
            <span>Overdue Urgency</span>
            <AlertTriangle className="w-4 h-4 text-[#FC734D]" />
          </div>
          <div className="text-3xl font-black text-[#FC734D] mt-2">
            {formatCurrency(totalOverdueAmount, currencyPreference, isConfidential)}
          </div>
          <div className="text-xs text-[#FC734D] mt-1">
            {overdueBills.length} overdue bill{overdueBills.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#081622] border border-[#143652]">
          <div className="flex justify-between items-center text-xs text-[#8397AB] font-bold uppercase tracking-wider">
            <span>Paid History</span>
            <CheckCircle2 className="w-4 h-4 text-[#0297DE]" />
          </div>
          <div className="text-3xl font-black text-[#0297DE] mt-2">
            {formatCurrency(totalPaidThisCycle, currencyPreference, isConfidential)}
          </div>
          <div className="text-xs text-[#8397AB] mt-1">
            {paidBills.length} bills settled on time
          </div>
        </div>
      </div>

      {/* Main Bills Planner Panel */}
      <div className="glass-card p-6 rounded-3xl border border-[#143652] space-y-4">
        {/* Header & Principle Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#143652]">
          <div>
            <h3 className="text-base font-extrabold text-[#FCFFFF] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#FC734D]" />
              Bills & Obligation Planner
            </h3>
            <p className="text-xs text-[#8397AB]">
              Manual tracking only • No bank direct-debits or automated account access
            </p>
          </div>

          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] text-[#02070A] text-xs font-black flex items-center gap-1.5 shadow-md shadow-[#FC734D]/20 hover:scale-105 transition-all self-start sm:self-center"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Bill to Pay
          </button>
        </div>

        {/* Tab & Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="flex bg-[#050E17] p-1 rounded-xl border border-[#143652] w-full sm:w-auto">
            <button
              onClick={() => setTab('UPCOMING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'UPCOMING'
                  ? 'bg-amber-400 text-[#02070A] shadow-sm'
                  : 'text-[#8397AB] hover:text-[#FCFFFF]'
              }`}
            >
              Upcoming ({upcomingBills.length})
            </button>
            <button
              onClick={() => setTab('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'OVERDUE'
                  ? 'bg-[#FC734D] text-[#02070A] shadow-sm'
                  : 'text-[#8397AB] hover:text-[#FCFFFF]'
              }`}
            >
              Overdue ({overdueBills.length})
            </button>
            <button
              onClick={() => setTab('PAID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'PAID'
                  ? 'bg-[#0297DE] text-[#02070A] shadow-sm'
                  : 'text-[#8397AB] hover:text-[#FCFFFF]'
              }`}
            >
              Paid ({paidBills.length})
            </button>
            <button
              onClick={() => setTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'ALL'
                  ? 'bg-[#143652] text-[#FCFFFF]'
                  : 'text-[#8397AB] hover:text-[#FCFFFF]'
              }`}
            >
              All ({bills.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8397AB] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search bills, notes, category..."
              className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
            />
          </div>
        </div>

        {/* Bills List */}
        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {displayedBills.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-[#050E17] border border-dashed border-[#143652]">
              <CreditCard className="w-8 h-8 text-[#8397AB] mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-[#FCFFFF]">No bills found</p>
              <p className="text-[11px] text-[#8397AB] mt-0.5">
                {tab === 'UPCOMING' ? 'All scheduled bills are settled!' : 'No records match this view.'}
              </p>
            </div>
          ) : (
            displayedBills.map(b => {
              const isPaid = b.status === 'PAID';
              const isOverdue = b.status === 'OVERDUE';

              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl bg-[#050E17] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isOverdue ? 'border-[#FC734D]/60 bg-[#FC734D]/5' :
                    isPaid ? 'border-[#143652] opacity-75' :
                    'border-[#143652] hover:border-amber-400/50'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isPaid ? 'bg-[#0297DE]/20 text-[#0297DE]' :
                      isOverdue ? 'bg-[#FC734D]/20 text-[#FC734D]' :
                      'bg-amber-400/20 text-amber-400'
                    }`}>
                      {isPaid ? <CheckCircle2 className="w-5 h-5" /> : 
                       isOverdue ? <AlertTriangle className="w-5 h-5" /> : 
                       <Clock className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#FCFFFF]">{b.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isPaid ? 'bg-[#0297DE]/20 text-[#0297DE] border border-[#0297DE]/30' :
                          isOverdue ? 'bg-[#FC734D]/20 text-[#FC734D] border border-[#FC734D]/40' :
                          'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                        }`}>
                          {b.status}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#143652] text-[10px] text-[#8397AB]">
                          {b.recurrence}
                        </span>
                      </div>

                      <div className="text-xs text-[#8397AB] flex flex-wrap items-center gap-3 mt-1">
                        <span>Category: <strong className="text-[#FCFFFF]/80">{b.category}</strong></span>
                        <span>Due Date: <strong className={isOverdue ? 'text-[#FC734D]' : 'text-[#FCFFFF]/90'}>{formatDate(b.dueDate)}</strong></span>
                        {b.reminderDaysBefore > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-400/90">
                            <Bell className="w-3 h-3" /> Remind {b.reminderDaysBefore}d before
                          </span>
                        )}
                      </div>

                      {b.notes && (
                        <p className="text-[11px] text-[#8397AB]/80 mt-1 italic">
                          "{b.notes}"
                        </p>
                      )}

                      {isPaid && b.paidDate && (
                        <span className="text-[10px] text-[#0297DE] mt-1 block font-medium">
                          Settled on {formatDate(b.paidDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#143652]">
                    <div className="text-right">
                      <span className="text-base font-black text-[#FCFFFF]">
                        {formatCurrency(b.amount, currencyPreference, isConfidential)}
                      </span>
                      <span className="block text-[10px] text-[#8397AB]">Amount Due</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isPaid && (
                        <button
                          onClick={() => onMarkPaid(b)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0297DE] to-[#0284C7] hover:scale-105 text-[#FCFFFF] text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Paid
                        </button>
                      )}

                      {isPaid && (
                        <button
                          onClick={() => onUpdateBill(b.id, { status: 'PENDING', paidDate: undefined })}
                          title="Mark as Unpaid"
                          className="p-1.5 rounded-lg bg-[#0D2235] hover:bg-[#143652] text-[#8397AB] transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => openEdit(b)}
                        title="Edit"
                        className="p-1.5 rounded-lg bg-[#0D2235] hover:bg-[#143652] text-[#8397AB] hover:text-[#FCFFFF] transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteBill(b.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg bg-[#0D2235] hover:bg-[#FC734D]/20 text-[#8397AB] hover:text-[#FC734D] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Bill Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02070A]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#081622] border border-[#143652] rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#143652] mb-4">
              <h3 className="text-base font-extrabold text-[#FCFFFF] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#FC734D]" />
                {editingId ? 'Edit Manual Bill' : 'Add Bill to Pay'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8397AB] hover:text-[#FCFFFF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Bill Name / Payee
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Broadband Fiber, Health Insurance, Electricity"
                  required
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Amount Due
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Amount"
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Rent / Housing">Rent / Housing</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Education">Education</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Recurrence
                  </label>
                  <select
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value as any)}
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  >
                    <option value="ONE_TIME">One-Time</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Reminder Setting
                </label>
                <select
                  value={reminderDays}
                  onChange={e => setReminderDays(parseInt(e.target.value))}
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                >
                  <option value={0}>On the due date</option>
                  <option value={1}>1 day before</option>
                  <option value={3}>3 days before</option>
                  <option value={7}>1 week before</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Personal Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Account #89324; pay via UPI bill desk"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D2235] text-xs font-bold text-[#8397AB] hover:text-[#FCFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-xs font-black text-[#02070A] shadow-md shadow-[#FC734D]/25"
                >
                  {editingId ? 'Update Bill' : 'Save Bill to Pay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
