import React, { useMemo, useState, useRef } from 'react';
import { Transaction, TransactionType, SavingsGoal } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, TrendingDown, PieChart as PieIcon, Download, FileText, Image as ImageIcon, Sparkles, Percent, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Props {
  transactions: Transaction[];
  goals?: SavingsGoal[];
}

// Brand color ramp for fintech analytics donut chart
const FINTECH_COLORS = [
  '#74FFED', // Aqua Jade
  '#22C58B', // Income Green
  '#FC734D', // Expense Coral
  '#38BDF8', // Sky Blue
  '#818CF8', // Indigo
  '#C084FC', // Purple
  '#F472B6', // Pink
  '#FBBF24', // Amber
  '#94A3B8'  // Slate
];

const StatsView: React.FC<Props> = ({ transactions, goals = [] }) => {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D'>('30D');
  const containerRef = useRef<HTMLDivElement>(null);

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

  const netSavings = stats.income - stats.expense;
  const savingsRate = stats.income > 0 ? Math.max(0, Math.round((netSavings / stats.income) * 100)) : 0;

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE) {
        data[t.category] = (data[t.category] || 0) + t.amount;
      }
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const topCategory = categoryData[0]?.name || 'None';

  const trendData = useMemo(() => {
    const daysToSubtract = timeRange === '7D' ? 6 : timeRange === '30D' ? 29 : 89;
    const result = [];
    
    for(let i = daysToSubtract; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayTx = transactions.filter(t => t.date === dateStr);
        const income = dayTx.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const expense = dayTx.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        
        const label = timeRange === '90D' 
            ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : d.toLocaleDateString('en-US', { weekday: 'short' });
            
        const finalLabel = timeRange === '7D' ? label : d.getDate().toString();

        result.push({
            date: timeRange === '90D' ? label : finalLabel,
            fullDate: dateStr,
            income,
            expense
        });
    }
    return result;
  }, [transactions, timeRange]);

  const handleDownload = async () => {
    if (containerRef.current) {
        const canvas = await html2canvas(containerRef.current, { 
            backgroundColor: document.body.classList.contains('light-mode') ? '#F3F5F8' : '#0C1126',
            scale: 2
        });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `LetsTrackIt_Analytics_${new Date().toISOString().split('T')[0]}.png`;
        link.click();
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0 animate-in fade-in duration-500" ref={containerRef}>
        {/* Header with Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-[var(--text-main)] flex items-center gap-2.5">
                  <div className="p-2 bg-[#74FFED]/15 text-[#74FFED] rounded-xl border border-[#74FFED]/30">
                    <FileText size={20} />
                  </div>
                  Financial Analytics
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Visual cash flow trends, breakdown by category, and savings pacing metrics.
              </p>
            </div>
            <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#74FFED]/10 border border-[#74FFED]/30 rounded-xl text-xs font-bold text-[#74FFED] hover:bg-[#74FFED] hover:text-[#171F44] transition-all shadow-sm active:scale-95 self-start sm:self-center"
            >
                <Download size={14} /> Export Report PNG
            </button>
        </div>

        {/* 3 Metric Ribbon Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[#22C58B]/30 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#22C58B] bg-[#22C58B]/10 px-2 py-0.5 rounded-full">
                        Total Income
                    </span>
                    <div className="p-1.5 rounded-lg bg-[#22C58B]/15 text-[#22C58B]">
                      <ArrowDownRight size={16} />
                    </div>
                </div>
                <p className="text-2xl md:text-3xl font-black font-mono text-[#22C58B] tracking-tight">
                  +₹{stats.income.toLocaleString()}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Incoming liquidity recorded</p>
            </div>

            <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[#FC734D]/30 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FC734D] bg-[#FC734D]/10 px-2 py-0.5 rounded-full">
                        Total Spent
                    </span>
                    <div className="p-1.5 rounded-lg bg-[#FC734D]/15 text-[#FC734D]">
                      <ArrowUpRight size={16} />
                    </div>
                </div>
                <p className="text-2xl md:text-3xl font-black font-mono text-[#FC734D] tracking-tight">
                  -₹{stats.expense.toLocaleString()}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Top category: <span className="font-bold text-[var(--text-main)]">{topCategory}</span></p>
            </div>

            <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[#74FFED]/30 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#74FFED] bg-[#74FFED]/10 px-2 py-0.5 rounded-full">
                        Net Savings
                    </span>
                    <div className="p-1.5 rounded-lg bg-[#74FFED]/15 text-[#74FFED]">
                      <Percent size={16} />
                    </div>
                </div>
                <p className={`text-2xl md:text-3xl font-black font-mono tracking-tight ${netSavings >= 0 ? 'text-[#74FFED]' : 'text-[#FC734D]'}`}>
                  {netSavings >= 0 ? '+' : ''}₹{netSavings.toLocaleString()}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Savings rate: <span className="font-bold text-[#22C58B]">{savingsRate}%</span></p>
            </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Spending vs Income Area Chart (Cash Flow) */}
            <div className="dashboard-card p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl min-h-[380px] flex flex-col shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h3 className="text-base font-extrabold text-[var(--text-main)]">Cash Flow Comparison</h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Dual-area tracking of income vs expenses</p>
                    </div>
                    <div className="flex bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-color)] self-start sm:self-center">
                        {(['7D', '30D', '90D'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${timeRange === range ? 'bg-[#74FFED] text-[#171F44] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 w-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22C58B" stopOpacity={0.35}/>
                                    <stop offset="95%" stopColor="#22C58B" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FC734D" stopOpacity={0.35}/>
                                    <stop offset="95%" stopColor="#FC734D" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.35} />
                            <XAxis 
                                dataKey="date" 
                                tick={{fontSize: 10, fill: '#8E9BB5'}} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={10} 
                                interval={timeRange === '90D' ? 6 : timeRange === '30D' ? 4 : 0}
                            />
                            <YAxis 
                                tick={{fontSize: 10, fill: '#8E9BB5'}}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val/1000)}k` : val}`}
                            />
                            <Tooltip 
                                cursor={{stroke: '#74FFED', strokeWidth: 1, strokeDasharray: '4 4'}}
                                contentStyle={{ 
                                  backgroundColor: '#171F44', 
                                  borderRadius: '14px', 
                                  border: '1px solid #26336B', 
                                  color: '#FCFFFF', 
                                  fontSize: '12px', 
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.4)' 
                                }}
                                labelStyle={{ color: '#8E9BB5', marginBottom: '0.25rem', fontWeight: 600 }}
                                labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
                                formatter={(value: number, name: string) => [
                                    <span key="val" className="font-bold font-mono">₹{value.toLocaleString()}</span>, 
                                    name === 'income' ? 'Income' : 'Expense'
                                ]}
                            />
                            <Legend 
                                verticalAlign="top" 
                                align="right"
                                height={32} 
                                iconType="circle" 
                                content={() => (
                                    <div className="flex justify-end gap-4 text-xs font-bold mb-3">
                                        <div className="flex items-center gap-1.5 text-[#22C58B]">
                                          <div className="w-2 h-2 rounded-full bg-[#22C58B]"></div> Income
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[#FC734D]">
                                          <div className="w-2 h-2 rounded-full bg-[#FC734D]"></div> Expense
                                        </div>
                                    </div>
                                )}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="income" 
                                stroke="#22C58B" 
                                strokeWidth={2.5} 
                                fillOpacity={1} 
                                fill="url(#colorIncome)" 
                                animationDuration={800}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="expense" 
                                stroke="#FC734D" 
                                strokeWidth={2.5} 
                                fillOpacity={1} 
                                fill="url(#colorExpense)" 
                                animationDuration={800}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Donut Chart */}
            <div className="dashboard-card p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl min-h-[380px] flex flex-col shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[var(--text-main)]">Spending by Category</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Top outgoing expense allocations</p>
                  </div>
                  <span className="text-xs font-bold text-[#74FFED] bg-[#74FFED]/10 border border-[#74FFED]/25 px-2.5 py-0.5 rounded-full">
                    {categoryData.length} Categories
                  </span>
                </div>
                <div className="flex-1 w-full flex items-center justify-center min-h-[250px]">
                    {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationDuration={800}
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell 
                                          key={`cell-${index}`} 
                                          fill={FINTECH_COLORS[index % FINTECH_COLORS.length]} 
                                          stroke="rgba(23, 31, 68, 0.8)" 
                                          strokeWidth={2}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: '#171F44', 
                                      borderRadius: '12px', 
                                      border: '1px solid #26336B', 
                                      color: '#FCFFFF', 
                                      fontSize: '12px' 
                                    }}
                                    itemStyle={{ color: '#FCFFFF' }} 
                                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Spent']}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={60} 
                                    iconType="circle"
                                    layout="horizontal"
                                    formatter={(value, entry: any) => {
                                      const total = categoryData.reduce((s, c) => s + c.value, 0);
                                      const percent = total > 0 ? Math.round(((entry.payload?.value || 0) / total) * 100) : 0;
                                      return (
                                        <span className="text-[11px] font-semibold text-[var(--text-muted)] capitalize">
                                          {value} <span className="text-[var(--text-main)] font-mono font-bold">({percent}%)</span>
                                        </span>
                                      );
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-[var(--text-muted)] text-sm flex flex-col items-center py-12">
                            <PieIcon size={42} className="mb-3 opacity-20"/>
                            <p className="font-medium">No spending logs recorded yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default StatsView;
