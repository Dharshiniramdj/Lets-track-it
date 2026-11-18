import React, { useState, useMemo, useRef } from 'react';
import { 
  Transaction, 
  TransactionType, 
  BillItem, 
  IncomeSource, 
  SavingsGoal, 
  EnvelopeBudget 
} from '../types';
import { formatCurrency, formatDate, exportToCSV, exportToExcelFile } from '../utils/formatters';
import { 
  Printer, 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  Layers, 
  FileText,
  DollarSign,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  transactions: Transaction[];
  bills: BillItem[];
  incomeSources: IncomeSource[];
  goals: SavingsGoal[];
  envelopes?: EnvelopeBudget[];
  currencyPreference?: string;
  isConfidential?: boolean;
}

export const FinancialReports: React.FC<Props> = ({
  transactions,
  bills,
  incomeSources,
  goals,
  envelopes = [],
  currencyPreference = 'INR',
  isConfidential = false
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [reportType, setReportType] = useState<'MONTHLY' | 'CATEGORY' | 'BILLS' | 'YEARLY'>('MONTHLY');
  const printRef = useRef<HTMLDivElement>(null);

  // Filter transactions for this month
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Income vs Expense for month
  const totalIncome = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [monthTransactions]);

  const totalExpense = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [monthTransactions]);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Category breakdown
  const categorySummary = useMemo(() => {
    const map: Record<string, number> = {};
    monthTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, totalExpense]);

  // Bills in this period
  const monthBills = useMemo(() => {
    return bills.filter(b => b.dueDate.startsWith(selectedMonth));
  }, [bills, selectedMonth]);

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV
  const handleExportCSV = () => {
    const rows = monthTransactions.map(t => ({
      ID: t.id,
      Date: t.date,
      Type: t.type,
      Purpose: t.purpose,
      Description: t.description || '',
      Category: t.category,
      Amount: t.amount,
      PaymentMode: t.mode,
      Platform: t.platform || ''
    }));
    exportToCSV(`letstrackit_statement_${selectedMonth}.csv`, rows);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = monthTransactions.map(t => ({
      'Transaction ID': t.id,
      'Date': t.date,
      'Type': t.type,
      'Title / Purpose': t.purpose,
      'Personal Note': t.description || '',
      'Category': t.category,
      'Amount': t.amount,
      'Payment Mode': t.mode,
      'Platform / Merchant': t.platform || ''
    }));
    exportToExcelFile(`letstrackit_statement_${selectedMonth}.xlsx`, `Statement ${selectedMonth}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="no-print glass-card p-6 rounded-3xl border border-[#143652] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#143652]">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0297DE]">
              Audit-Ready Statements & Analytics
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-[#FCFFFF] mt-0.5">
              Financial Reporting & Printable Statements
            </h3>
            <p className="text-xs text-[#8397AB] mt-0.5">
              Export ink-friendly A4 PDF statements, CSV ledgers, or Excel spreadsheets with zero vendor lock-in.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] font-bold focus:outline-none focus:border-[#FC734D]"
            />

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] text-[#02070A] text-xs font-black shadow-lg shadow-[#FC734D]/25 flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              Print / Save PDF
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-[#081622] hover:bg-[#0D2235] border border-[#143652] text-xs font-bold text-[#22C58B] flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel (.xlsx)
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-[#081622] hover:bg-[#0D2235] border border-[#143652] text-xs font-bold text-[#0297DE] flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 pt-4 overflow-x-auto">
          {[
            { id: 'MONTHLY', label: 'Monthly Summary' },
            { id: 'CATEGORY', label: 'Category Spending' },
            { id: 'BILLS', label: 'Bills Payment History' },
            { id: 'YEARLY', label: 'Annual Cash Flow' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setReportType(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                reportType === t.id
                  ? 'bg-[#0297DE] text-[#02070A]'
                  : 'bg-[#050E17] text-[#8397AB] hover:text-[#FCFFFF] border border-[#143652]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          PRINTABLE & ON-SCREEN STATEMENT LAYOUT
          (Uses @media print ink-friendly styling: white background, black text, clean tables)
         ======================================================== */}
      <div 
        ref={printRef}
        className="glass-card p-8 rounded-3xl border border-[#143652] space-y-6 text-[#FCFFFF] bg-[#081622] print:bg-white print:text-black print:p-0 print:border-none print:shadow-none"
      >
        {/* Printable Statement Header */}
        <div className="flex justify-between items-start pb-6 border-b border-[#143652] print:border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-[#FCFFFF] print:text-black">
                Let's Track It
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#143652] text-[#0297DE] print:bg-slate-100 print:text-slate-700 font-bold">
                CONFIDENTIAL STATEMENT
              </span>
            </div>
            <p className="text-xs text-[#8397AB] print:text-slate-600 mt-1">
              Personal Cash Flow, Balance & Obligations Ledger
            </p>
          </div>

          <div className="text-right text-xs text-[#8397AB] print:text-slate-600">
            <p className="font-bold text-[#FCFFFF] print:text-black">
              Statement Period: {selectedMonth}
            </p>
            <p>Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <p>Currency: {currencyPreference}</p>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
          <div className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] print:bg-slate-50 print:border-slate-200">
            <span className="text-[10px] uppercase font-bold text-[#8397AB] print:text-slate-600 block">
              Total Inflow
            </span>
            <span className="text-xl font-black text-[#0297DE] print:text-slate-900 mt-1 block">
              {formatCurrency(totalIncome, currencyPreference, isConfidential)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] print:bg-slate-50 print:border-slate-200">
            <span className="text-[10px] uppercase font-bold text-[#8397AB] print:text-slate-600 block">
              Total Outflow
            </span>
            <span className="text-xl font-black text-[#FC734D] print:text-slate-900 mt-1 block">
              {formatCurrency(totalExpense, currencyPreference, isConfidential)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] print:bg-slate-50 print:border-slate-200">
            <span className="text-[10px] uppercase font-bold text-[#8397AB] print:text-slate-600 block">
              Net Surplus / Savings
            </span>
            <span className={`text-xl font-black mt-1 block ${netSavings >= 0 ? 'text-[#22C58B]' : 'text-[#FC734D]'} print:text-slate-900`}>
              {formatCurrency(netSavings, currencyPreference, isConfidential)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] print:bg-slate-50 print:border-slate-200">
            <span className="text-[10px] uppercase font-bold text-[#8397AB] print:text-slate-600 block">
              Savings Rate
            </span>
            <span className="text-xl font-black text-[#0297DE] print:text-slate-900 mt-1 block">
              {savingsRate}%
            </span>
          </div>
        </div>

        {/* Section: Category Spending Table */}
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#FCFFFF] print:text-black">
            1. Category-Wise Spending Breakdown
          </h4>
          <table className="w-full text-xs text-left border-collapse border border-[#143652] print:border-slate-300">
            <thead>
              <tr className="bg-[#050E17] print:bg-slate-100 text-[#8397AB] print:text-slate-800">
                <th className="p-2.5 border border-[#143652] print:border-slate-300">Budget Category</th>
                <th className="p-2.5 border border-[#143652] print:border-slate-300 text-right">Amount Spent</th>
                <th className="p-2.5 border border-[#143652] print:border-slate-300 text-right">% of Total Expenses</th>
              </tr>
            </thead>
            <tbody>
              {categorySummary.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-[#8397AB] print:text-slate-500">
                    No expense records for this period.
                  </td>
                </tr>
              ) : (
                categorySummary.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#143652] print:border-slate-200 hover:bg-[#050E17]/40 print:hover:bg-slate-50">
                    <td className="p-2.5 border border-[#143652] print:border-slate-200 font-bold text-[#FCFFFF] print:text-slate-900">
                      {item.category}
                    </td>
                    <td className="p-2.5 border border-[#143652] print:border-slate-200 text-right font-black text-[#FC734D] print:text-slate-900">
                      {formatCurrency(item.amount, currencyPreference, isConfidential)}
                    </td>
                    <td className="p-2.5 border border-[#143652] print:border-slate-200 text-right font-semibold text-[#8397AB] print:text-slate-700">
                      {item.percentage}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Section: Transaction Audit Trail */}
        <div className="space-y-3 pt-4">
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#FCFFFF] print:text-black">
            2. Chronological Transactions Ledger
          </h4>
          <table className="w-full text-xs text-left border-collapse border border-[#143652] print:border-slate-300">
            <thead>
              <tr className="bg-[#050E17] print:bg-slate-100 text-[#8397AB] print:text-slate-800">
                <th className="p-2.5 border border-[#143652] print:border-slate-300">Date</th>
                <th className="p-2.5 border border-[#143652] print:border-slate-300">Title & Personal Note</th>
                <th className="p-2.5 border border-[#143652] print:border-slate-300">Category</th>
                <th className="p-2.5 border border-[#143652] print:border-slate-300">Method</th>
                <th className="p-2.5 border border-[#143652] print:border-slate-300 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {monthTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-[#8397AB] print:text-slate-500">
                    No transactions recorded in {selectedMonth}.
                  </td>
                </tr>
              ) : (
                monthTransactions.map(tx => {
                  const isIncome = tx.type === TransactionType.INCOME;
                  return (
                    <tr key={tx.id} className="border-b border-[#143652] print:border-slate-200">
                      <td className="p-2 border border-[#143652] print:border-slate-200 font-mono text-[11px] text-[#8397AB] print:text-slate-700">
                        {formatDate(tx.date)}
                      </td>
                      <td className="p-2 border border-[#143652] print:border-slate-200">
                        <span className="font-bold text-[#FCFFFF] print:text-slate-900 block">{tx.purpose}</span>
                        {tx.description && (
                          <span className="text-[11px] text-[#8397AB] print:text-slate-500 italic block">
                            "{tx.description}"
                          </span>
                        )}
                      </td>
                      <td className="p-2 border border-[#143652] print:border-slate-200 text-[#8397AB] print:text-slate-700">
                        {tx.category}
                      </td>
                      <td className="p-2 border border-[#143652] print:border-slate-200 text-[#8397AB] print:text-slate-700">
                        {tx.mode}
                      </td>
                      <td className={`p-2 border border-[#143652] print:border-slate-200 text-right font-black ${
                        isIncome ? 'text-[#0297DE]' : 'text-[#FC734D]'
                      } print:text-slate-900`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount, currencyPreference, isConfidential)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Section: Manual Bills Paid vs Pending */}
        {monthBills.length > 0 && (
          <div className="space-y-3 pt-4">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#FCFFFF] print:text-black">
              3. Manual Bills & Obligations Log
            </h4>
            <table className="w-full text-xs text-left border-collapse border border-[#143652] print:border-slate-300">
              <thead>
                <tr className="bg-[#050E17] print:bg-slate-100 text-[#8397AB] print:text-slate-800">
                  <th className="p-2 border border-[#143652] print:border-slate-300">Due Date</th>
                  <th className="p-2 border border-[#143652] print:border-slate-300">Bill Payee</th>
                  <th className="p-2 border border-[#143652] print:border-slate-300">Category</th>
                  <th className="p-2 border border-[#143652] print:border-slate-300">Status</th>
                  <th className="p-2 border border-[#143652] print:border-slate-300 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {monthBills.map(b => (
                  <tr key={b.id} className="border-b border-[#143652] print:border-slate-200">
                    <td className="p-2 border border-[#143652] print:border-slate-200 text-[11px] text-[#8397AB] print:text-slate-700">
                      {formatDate(b.dueDate)}
                    </td>
                    <td className="p-2 border border-[#143652] print:border-slate-200 font-bold text-[#FCFFFF] print:text-slate-900">
                      {b.name}
                    </td>
                    <td className="p-2 border border-[#143652] print:border-slate-200 text-[#8397AB] print:text-slate-700">
                      {b.category}
                    </td>
                    <td className="p-2 border border-[#143652] print:border-slate-200 font-bold text-[11px]">
                      {b.status}
                    </td>
                    <td className="p-2 border border-[#143652] print:border-slate-200 text-right font-black text-[#FCFFFF] print:text-slate-900">
                      {formatCurrency(b.amount, currencyPreference, isConfidential)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Printable Footer / Signoff */}
        <div className="pt-6 border-t border-[#143652] print:border-slate-300 flex justify-between items-center text-[10px] text-[#8397AB] print:text-slate-500">
          <div>
            Self-hosted personal finance ledger • Generated privately with Let's Track It • No third-party data tracking
          </div>
          <div>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};
