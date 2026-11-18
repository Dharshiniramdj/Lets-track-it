import React, { useState, useMemo } from 'react';
import { IncomeSource, Transaction, TransactionType, PaymentMode, Category } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Briefcase, 
  Repeat, 
  Calendar, 
  X, 
  PieChart as PieIcon,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface Props {
  incomeSources: IncomeSource[];
  onAddSource: (source: Omit<IncomeSource, 'id' | 'createdAt'>) => void;
  onUpdateSource: (id: string, updates: Partial<IncomeSource>) => void;
  onDeleteSource: (id: string) => void;
  onLogAsTransaction?: (source: IncomeSource) => void;
  currencyPreference?: string;
  isConfidential?: boolean;
}

const INCOME_PALETTE = [
  '#0297DE', // Electric Blue
  '#22C58B', // Emerald Green
  '#FC734D', // Cantaloupe Orange
  '#38BDF8', // Sky Blue
  '#818CF8', // Indigo
  '#C084FC', // Violet
  '#FBBF24', // Amber
];

export const MultipleIncomeTracker: React.FC<Props> = ({
  incomeSources,
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  onLogAsTransaction,
  currencyPreference = 'INR',
  isConfidential = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Salary');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [frequency, setFrequency] = useState<'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'ONE_TIME'>('MONTHLY');

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Salary');
    setDescription('');
    setIsRecurring(true);
    setFrequency('MONTHLY');
    setShowModal(true);
  };

  const openEdit = (src: IncomeSource) => {
    setEditingId(src.id);
    setName(src.name);
    setAmount(src.amount.toString());
    setDate(src.date);
    setCategory(src.category);
    setDescription(src.description || '');
    setIsRecurring(src.isRecurring);
    setFrequency(src.recurrenceFrequency || 'MONTHLY');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    const payload = {
      accountId: 'default',
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      date,
      category,
      description: description.trim() || undefined,
      isRecurring,
      recurrenceFrequency: isRecurring ? frequency : 'ONE_TIME'
    };

    if (editingId) {
      onUpdateSource(editingId, payload);
    } else {
      onAddSource(payload);
    }
    setShowModal(false);
  };

  const totalMonthlyIncome = useMemo(() => {
    return incomeSources.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [incomeSources]);

  const recurringTotal = useMemo(() => {
    return incomeSources
      .filter(s => s.isRecurring)
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [incomeSources]);

  const oneTimeTotal = totalMonthlyIncome - recurringTotal;

  const chartData = useMemo(() => {
    return incomeSources.map(s => ({
      name: s.name,
      value: s.amount
    }));
  }, [incomeSources]);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[#081622] border border-[#143652] relative overflow-hidden">
          <div className="flex justify-between items-center text-xs text-[#8397AB] font-bold uppercase tracking-wider">
            <span>Total Monthly Inflow</span>
            <TrendingUp className="w-4 h-4 text-[#0297DE]" />
          </div>
          <div className="text-3xl font-black text-[#0297DE] mt-2">
            {formatCurrency(totalMonthlyIncome, currencyPreference, isConfidential)}
          </div>
          <div className="text-xs text-[#8397AB] mt-1">
            Across {incomeSources.length} active income stream{incomeSources.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#081622] border border-[#143652]">
          <div className="flex justify-between items-center text-xs text-[#8397AB] font-bold uppercase tracking-wider">
            <span>Recurring Base (Guaranteed)</span>
            <Repeat className="w-4 h-4 text-[#22C58B]" />
          </div>
          <div className="text-3xl font-black text-[#FCFFFF] mt-2">
            {formatCurrency(recurringTotal, currencyPreference, isConfidential)}
          </div>
          <div className="text-xs text-[#22C58B] mt-1">
            {totalMonthlyIncome > 0 ? Math.round((recurringTotal / totalMonthlyIncome) * 100) : 0}% predictable income
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#081622] border border-[#143652]">
          <div className="flex justify-between items-center text-xs text-[#8397AB] font-bold uppercase tracking-wider">
            <span>One-Time / Side Gigs</span>
            <Sparkles className="w-4 h-4 text-[#FC734D]" />
          </div>
          <div className="text-3xl font-black text-[#FC734D] mt-2">
            {formatCurrency(oneTimeTotal, currencyPreference, isConfidential)}
          </div>
          <div className="text-xs text-[#8397AB] mt-1">
            Bonuses, freelance payouts, dividends
          </div>
        </div>
      </div>

      {/* Main Income Breakdown & Streams Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streams List */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-[#143652] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#143652]">
            <div>
              <h3 className="text-base font-extrabold text-[#FCFFFF] flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#0297DE]" />
                Income Streams Portfolio
              </h3>
              <p className="text-xs text-[#8397AB]">
                Never limited to just one monthly salary entry
              </p>
            </div>
            <button
              onClick={openAdd}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0297DE] to-[#0284C7] text-[#FCFFFF] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#0297DE]/20 hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Income Stream
            </button>
          </div>

          <div className="space-y-3">
            {incomeSources.length === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-[#050E17] border border-dashed border-[#143652]">
                <TrendingUp className="w-8 h-8 text-[#8397AB] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-[#FCFFFF]">No income sources configured</p>
                <p className="text-[11px] text-[#8397AB] mt-0.5">Click "Add Income Stream" to start tracking multiple streams.</p>
              </div>
            ) : (
              incomeSources.map((src, i) => {
                const color = INCOME_PALETTE[i % INCOME_PALETTE.length];
                return (
                  <div
                    key={src.id}
                    className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] hover:border-[#0297DE]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ backgroundColor: `${color}20`, color: color }}
                      >
                        {src.category.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#FCFFFF]">{src.name}</h4>
                          <span className="px-2 py-0.5 rounded bg-[#143652] text-[10px] font-bold text-[#0297DE]">
                            {src.category}
                          </span>
                          {src.isRecurring && (
                            <span className="px-2 py-0.5 rounded bg-[#22C58B]/15 text-[10px] font-bold text-[#22C58B] flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              {src.recurrenceFrequency || 'Monthly'}
                            </span>
                          )}
                        </div>
                        {src.description && (
                          <p className="text-xs text-[#8397AB] mt-0.5 italic">
                            "{src.description}"
                          </p>
                        )}
                        <span className="text-[11px] text-[#8397AB] mt-1 block">
                          Recorded Date: {formatDate(src.date)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#143652]">
                      <div className="text-right">
                        <span className="text-base font-black text-[#0297DE]">
                          {formatCurrency(src.amount, currencyPreference, isConfidential)}
                        </span>
                        <span className="block text-[10px] text-[#8397AB]">
                          {totalMonthlyIncome > 0 ? Math.round((src.amount / totalMonthlyIncome) * 100) : 0}% of total
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onLogAsTransaction && (
                          <button
                            onClick={() => onLogAsTransaction(src)}
                            title="Log as transaction in ledger"
                            className="p-1.5 rounded-lg bg-[#0297DE]/15 hover:bg-[#0297DE]/25 text-[#0297DE] transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(src)}
                          title="Edit"
                          className="p-1.5 rounded-lg bg-[#0D2235] hover:bg-[#143652] text-[#8397AB] hover:text-[#FCFFFF] transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteSource(src.id)}
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

        {/* Donut Chart Visualizer */}
        <div className="glass-card p-6 rounded-3xl border border-[#143652] space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#FCFFFF] flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-[#FC734D]" />
              Inflow Distribution
            </h3>
            <p className="text-xs text-[#8397AB]">
              Proportion of total inflow by source
            </p>
          </div>

          <div className="h-52 w-full my-auto">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={INCOME_PALETTE[index % INCOME_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#081622', borderColor: '#143652', borderRadius: '12px' }}
                    formatter={(val: any) => [formatCurrency(Number(val) || 0, currencyPreference, isConfidential), 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#8397AB]">
                No data to display
              </div>
            )}
          </div>

          {/* Quick Legend */}
          <div className="space-y-1.5 pt-2 border-t border-[#143652]">
            {incomeSources.slice(0, 4).map((s, idx) => (
              <div key={s.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: INCOME_PALETTE[idx % INCOME_PALETTE.length] }} 
                  />
                  <span className="text-[#8397AB] truncate max-w-[120px]">{s.name}</span>
                </div>
                <span className="font-bold text-[#FCFFFF]">
                  {formatCurrency(s.amount, currencyPreference, isConfidential)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add / Edit Income Source Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02070A]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#081622] border border-[#143652] rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#143652] mb-4">
              <h3 className="text-base font-extrabold text-[#FCFFFF] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0297DE]" />
                {editingId ? 'Edit Income Stream' : 'Add New Income Stream'}
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
                  Stream Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Lead Engineer Salary, UI/UX Consulting, Dividend Yield"
                  required
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Monthly Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Amount"
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Date Received
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
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
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Freelancing">Freelancing</option>
                    <option value="Business">Business</option>
                    <option value="Investments">Investments</option>
                    <option value="Rental">Rental</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as any)}
                    disabled={!isRecurring}
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE] disabled:opacity-50"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="BIWEEKLY">Bi-weekly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="ONE_TIME">One-Time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#FCFFFF] py-1">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={e => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-[#0297DE] rounded border-[#143652] bg-[#050E17]"
                  />
                  <span>Recurring monthly income stream</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Personal Description / Note
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Retainer contract for mobile client, paid on the 1st"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0297DE] to-[#0284C7] text-xs font-black text-[#FCFFFF] shadow-md shadow-[#0297DE]/25"
                >
                  {editingId ? 'Update Stream' : 'Save Income Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
