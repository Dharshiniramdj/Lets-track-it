import React, { useState, useMemo } from 'react';
import { 
  Transaction, 
  TransactionType, 
  UpcomingDelivery, 
  BillItem, 
  SavingsGoal 
} from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { DeliveriesPanel } from './DeliveriesPanel';
import { 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  CreditCard, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShoppingBag,
  Calendar as CalendarIcon,
  Clock,
  Target,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';

interface Props {
  transactions: Transaction[];
  deliveries: UpcomingDelivery[];
  bills?: BillItem[];
  goals?: SavingsGoal[];
  onAddDelivery: (delivery: Omit<UpcomingDelivery, 'id' | 'createdAt'>) => void;
  onUpdateDelivery: (id: string, updates: Partial<UpcomingDelivery>) => void;
  onDeleteDelivery: (id: string) => void;
  currencyPreference?: string;
  isConfidential?: boolean;
}

const CalendarView: React.FC<Props> = ({ 
  transactions,
  deliveries,
  bills = [],
  goals = [],
  onAddDelivery,
  onUpdateDelivery,
  onDeleteDelivery,
  currencyPreference = 'INR',
  isConfidential = false
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK' | 'DAY'>('MONTH');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Month days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const startDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const paddingDays = Array(startDayIndex).fill(null);

  // Week days
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const first = curr.getDate() - curr.getDay();
    const daysArr = [];
    for (let i = 0; i < 7; i++) {
      daysArr.push(new Date(curr.setDate(first + i)));
    }
    return daysArr;
  }, [currentDate]);

  const prevPeriod = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'WEEK') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'WEEK') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getDayContent = (day: Date) => {
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    const dayStr = `${year}-${month}-${d}`;

    const dayTransactions = transactions.filter(t => t.date === dayStr);
    const dayDeliveries = deliveries.filter(del => del.expectedDate === dayStr);
    const dayBills = bills.filter(b => b.dueDate === dayStr);

    const totalIncome = dayTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSpent = dayTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    return { 
      dayTransactions, 
      dayDeliveries, 
      dayBills,
      totalIncome, 
      totalSpent, 
      dayStr 
    };
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const yearName = currentDate.getFullYear();
  const today = new Date();

  const selectedDayTransactions = transactions.filter(t => t.date === selectedDay);
  const selectedDayDeliveries = deliveries.filter(d => d.expectedDate === selectedDay);
  const selectedDayBills = bills.filter(b => b.dueDate === selectedDay);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Calendar Header with View Switcher */}
      <div className="glass-card p-6 rounded-3xl border border-[#143652] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#0297DE]/15 border border-[#0297DE]/30 flex items-center justify-center text-[#0297DE]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#FCFFFF] flex items-center gap-2">
              <span className="text-[#0297DE]">{monthName}</span>
              <span className="text-[#8397AB] font-light">{yearName}</span>
            </h2>
            <p className="text-xs text-[#8397AB]">
              Timeline of cash flow, bill deadlines, and independent delivery tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher (Month, Week, Day) */}
          <div className="flex bg-[#050E17] p-1 rounded-xl border border-[#143652]">
            <button
              onClick={() => setViewMode('MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'MONTH' ? 'bg-[#FC734D] text-[#02070A] shadow-sm' : 'text-[#8397AB] hover:text-[#FCFFFF]'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('WEEK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'WEEK' ? 'bg-[#FC734D] text-[#02070A] shadow-sm' : 'text-[#8397AB] hover:text-[#FCFFFF]'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('DAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'DAY' ? 'bg-[#FC734D] text-[#02070A] shadow-sm' : 'text-[#8397AB] hover:text-[#FCFFFF]'
              }`}
            >
              Day
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={prevPeriod} 
              className="p-2 hover:bg-[#0D2235] rounded-xl border border-[#143652] text-[#8397AB] hover:text-[#FCFFFF] transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="px-3 py-1.5 hover:bg-[#0D2235] rounded-xl border border-[#143652] text-xs font-bold text-[#FCFFFF] transition-colors"
            >
              Today
            </button>
            <button 
              onClick={nextPeriod} 
              className="p-2 hover:bg-[#0D2235] rounded-xl border border-[#143652] text-[#8397AB] hover:text-[#FCFFFF] transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Dedicated Financial Calendar + Separate Upcoming Deliveries Panel alongside */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial Calendar */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-[#143652] space-y-4">
          {/* Legend Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#143652] text-xs">
            <span className="font-bold text-[#8397AB]">Legend:</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] text-[#0297DE] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#0297DE]" /> Inflow Dates
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#FC734D] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#FC734D]" /> Outflow Expenses
              </span>
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Bill Deadlines
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#38BDF8] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" /> Deliveries (Separated)
              </span>
            </div>
          </div>

          {/* MONTH VIEW */}
          {viewMode === 'MONTH' && (
            <div className="grid grid-cols-7 gap-px bg-[#143652] border border-[#143652] rounded-2xl overflow-hidden shadow-inner">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="bg-[#050E17] p-2.5 text-center text-xs font-bold text-[#8397AB] uppercase tracking-wider">
                  {d}
                </div>
              ))}

              {paddingDays.map((_, i) => (
                <div key={`padding-${i}`} className="bg-[#02070A]/60 min-h-[90px]" />
              ))}

              {days.map((day) => {
                const { dayTransactions, dayDeliveries, dayBills, totalIncome, totalSpent, dayStr } = getDayContent(day);
                const isTodayDate = isSameDay(day, today);
                const hasData = dayTransactions.length > 0 || dayDeliveries.length > 0 || dayBills.length > 0;

                return (
                  <div 
                    key={day.toISOString()} 
                    onClick={() => setSelectedDay(dayStr)}
                    className={`bg-[#081622] min-h-[95px] p-2 transition-all relative flex flex-col cursor-pointer border-t border-l border-transparent hover:border-[#0297DE]/50 ${
                      hasData ? 'hover:bg-[#0D2235]' : 'opacity-70'
                    }`}
                  >
                    <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      isTodayDate ? 'bg-[#FC734D] text-[#02070A] shadow-md font-black' : 'text-[#8397AB]'
                    }`}>
                      {day.getDate()}
                    </div>
                    
                    <div className="flex-1 overflow-hidden space-y-1">
                      {totalIncome > 0 && (
                        <div className="text-[9px] text-[#0297DE] font-bold bg-[#0297DE]/15 px-1 py-0.5 rounded truncate border border-[#0297DE]/30">
                          +{formatCurrency(totalIncome, currencyPreference, isConfidential)}
                        </div>
                      )}
                      {totalSpent > 0 && (
                        <div className="text-[9px] text-[#FC734D] font-bold bg-[#FC734D]/15 px-1 py-0.5 rounded truncate border border-[#FC734D]/30">
                          -{formatCurrency(totalSpent, currencyPreference, isConfidential)}
                        </div>
                      )}
                      {dayBills.length > 0 && (
                        <div className="text-[9px] text-amber-400 font-bold bg-amber-400/15 px-1 py-0.5 rounded truncate border border-amber-400/30 flex items-center gap-0.5">
                          <CreditCard size={8} /> {dayBills.length} Bill{dayBills.length > 1 ? 's' : ''}
                        </div>
                      )}
                      {dayDeliveries.length > 0 && (
                        <div className="text-[9px] text-[#38BDF8] font-bold bg-[#38BDF8]/15 px-1 py-0.5 rounded truncate border border-[#38BDF8]/30 flex items-center gap-0.5">
                          <Package size={8} /> {dayDeliveries.length} Package{dayDeliveries.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'WEEK' && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const { dayTransactions, dayDeliveries, dayBills, totalIncome, totalSpent, dayStr } = getDayContent(day);
                const isTodayDate = isSameDay(day, today);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(dayStr)}
                    className={`p-3 rounded-2xl bg-[#081622] border transition-all cursor-pointer min-h-[220px] flex flex-col justify-between ${
                      isTodayDate ? 'border-[#FC734D] shadow-md shadow-[#FC734D]/10' : 'border-[#143652] hover:border-[#0297DE]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center pb-2 border-b border-[#143652]">
                        <span className="text-xs font-bold text-[#8397AB]">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          isTodayDate ? 'bg-[#FC734D] text-[#02070A]' : 'text-[#FCFFFF]'
                        }`}>
                          {day.getDate()}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1.5 text-xs">
                        {totalIncome > 0 && (
                          <div className="p-1 rounded bg-[#0297DE]/15 text-[#0297DE] font-bold text-[10px]">
                            +{formatCurrency(totalIncome, currencyPreference, isConfidential)}
                          </div>
                        )}
                        {totalSpent > 0 && (
                          <div className="p-1 rounded bg-[#FC734D]/15 text-[#FC734D] font-bold text-[10px]">
                            -{formatCurrency(totalSpent, currencyPreference, isConfidential)}
                          </div>
                        )}
                        {dayBills.map(b => (
                          <div key={b.id} className="p-1 rounded bg-amber-400/15 text-amber-400 text-[10px] truncate">
                            Due: {b.name}
                          </div>
                        ))}
                        {dayDeliveries.map(d => (
                          <div key={d.id} className="p-1 rounded bg-[#38BDF8]/15 text-[#38BDF8] text-[10px] truncate">
                            Pkg: {d.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    <span className="text-[10px] text-[#8397AB] text-center pt-2">
                      {dayTransactions.length} activity
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* DAY VIEW */}
          {viewMode === 'DAY' && (
            <div className="p-6 rounded-2xl bg-[#050E17] border border-[#143652] space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#143652]">
                <h3 className="text-lg font-bold text-[#FCFFFF]">
                  {currentDate.toLocaleDateString('en-US', { dateStyle: 'full' })}
                </h3>
                <span className="text-xs text-[#8397AB]">Detailed Agenda</span>
              </div>

              {(() => {
                const { dayTransactions, dayDeliveries, dayBills, totalIncome, totalSpent } = getDayContent(currentDate);
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-[#081622] border border-[#143652]">
                        <span className="text-[10px] text-[#8397AB] uppercase font-bold">Income</span>
                        <span className="text-lg font-black text-[#0297DE] block mt-0.5">
                          {formatCurrency(totalIncome, currencyPreference, isConfidential)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#081622] border border-[#143652]">
                        <span className="text-[10px] text-[#8397AB] uppercase font-bold">Expense</span>
                        <span className="text-lg font-black text-[#FC734D] block mt-0.5">
                          {formatCurrency(totalSpent, currencyPreference, isConfidential)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#FCFFFF] uppercase tracking-wider">Entries</h4>
                      {dayTransactions.length === 0 && dayBills.length === 0 && dayDeliveries.length === 0 ? (
                        <p className="text-xs text-[#8397AB] py-4 text-center">No financial events recorded on this date.</p>
                      ) : (
                        dayTransactions.map(t => (
                          <div key={t.id} className="p-3 rounded-xl bg-[#081622] border border-[#143652] flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-[#FCFFFF]">{t.purpose}</p>
                              <span className="text-[10px] text-[#8397AB]">{t.category} • {t.mode}</span>
                            </div>
                            <span className={`font-black ${t.type === TransactionType.INCOME ? 'text-[#0297DE]' : 'text-[#FC734D]'}`}>
                              {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount, currencyPreference, isConfidential)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right 1 Col: Dedicated Upcoming Deliveries Box (SEPARATE from bills) */}
        <div>
          <DeliveriesPanel
            deliveries={deliveries}
            onAddDelivery={onAddDelivery}
            onUpdateDelivery={onUpdateDelivery}
            onDeleteDelivery={onDeleteDelivery}
            currencyPreference={currencyPreference}
            isConfidential={isConfidential}
          />
        </div>
      </div>

      {/* Selected Day Modal Dialog */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02070A]/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-card bg-[#081622] w-full max-w-lg rounded-3xl border border-[#143652] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-[#143652] flex justify-between items-center bg-[#050E17]/60">
              <div>
                <h3 className="text-base font-extrabold text-[#FCFFFF]">Daily Schedule & Breakdown</h3>
                <p className="text-xs text-[#0297DE] font-bold">
                  {new Date(selectedDay).toLocaleDateString('en-US', { dateStyle: 'full' })}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDay(null)} 
                className="p-1.5 rounded-xl hover:bg-[#0D2235] text-[#8397AB] hover:text-[#FCFFFF] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Transactions Section */}
              <div>
                <h4 className="text-xs font-bold text-[#FCFFFF] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#FC734D]" />
                  Recorded Cash Transactions ({selectedDayTransactions.length})
                </h4>
                {selectedDayTransactions.length === 0 ? (
                  <p className="text-xs text-[#8397AB] italic">No transactions recorded on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayTransactions.map(t => (
                      <div key={t.id} className="p-3 rounded-xl bg-[#050E17] border border-[#143652] flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-[#FCFFFF]">{t.purpose}</p>
                          <p className="text-[10px] text-[#8397AB]">{t.category} • {t.mode}</p>
                        </div>
                        <span className={`font-black ${t.type === TransactionType.INCOME ? 'text-[#0297DE]' : 'text-[#FC734D]'}`}>
                          {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount, currencyPreference, isConfidential)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bills Due Section */}
              {selectedDayBills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Bills Due Today ({selectedDayBills.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDayBills.map(b => (
                      <div key={b.id} className="p-3 rounded-xl bg-[#050E17] border border-amber-400/30 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-[#FCFFFF]">{b.name}</p>
                          <span className="text-[10px] text-amber-400 font-bold">{b.status}</span>
                        </div>
                        <span className="font-black text-[#FCFFFF]">
                          {formatCurrency(b.amount, currencyPreference, isConfidential)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliveries Expected Section */}
              {selectedDayDeliveries.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#38BDF8]" />
                    Upcoming Packages Expected ({selectedDayDeliveries.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDayDeliveries.map(d => (
                      <div key={d.id} className="p-3 rounded-xl bg-[#050E17] border border-[#38BDF8]/30 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-[#FCFFFF]">{d.name}</p>
                          <span className="text-[10px] text-[#38BDF8] font-bold">{d.carrier} • {d.status}</span>
                        </div>
                        <span className="font-bold text-[#FCFFFF]">
                          {formatCurrency(d.estimatedAmount, currencyPreference, isConfidential)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#050E17] border-t border-[#143652] flex justify-end">
              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 rounded-xl bg-[#0D2235] text-xs font-bold text-[#FCFFFF]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
