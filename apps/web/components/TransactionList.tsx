import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { formatCurrency, formatDate, exportToCSV, exportToExcelFile } from '../utils/formatters';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Search, 
  Trash2, 
  Tag, 
  Filter, 
  FileSpreadsheet, 
  FileText, 
  Image as ImageIcon, 
  Pencil, 
  Calendar, 
  X,
  Receipt,
  Eye,
  ArrowUpDown,
  Briefcase
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  currencyPreference?: string;
  isConfidential?: boolean;
}

const TransactionList: React.FC<Props> = ({ 
  transactions, 
  onDelete, 
  onEdit,
  currencyPreference = 'INR',
  isConfidential = false
}) => {
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const filteredData = transactions.filter(t => {
    const matchesSearch = 
      t.purpose.toLowerCase().includes(filter.toLowerCase()) || 
      t.category.toLowerCase().includes(filter.toLowerCase()) ||
      t.platform.toLowerCase().includes(filter.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(filter.toLowerCase())) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))) ||
      (t.incomeSource && t.incomeSource.toLowerCase().includes(filter.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    const matchesCat = categoryFilter === 'ALL' || t.category === categoryFilter;
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(t.date) >= new Date(startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(t.date) <= new Date(endDate);
    }

    return matchesSearch && matchesType && matchesCat && matchesDate;
  }).sort((a, b) => {
    if (sortBy === 'DATE_DESC') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'DATE_ASC') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'AMOUNT_DESC') return b.amount - a.amount;
    return a.amount - b.amount;
  });

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredData.map(t => ({
      Date: t.date,
      Type: t.type,
      Title: t.purpose,
      'Personal Note': t.description || '',
      Category: t.category,
      Amount: t.amount,
      Mode: t.mode,
      Platform: t.platform,
      'Income Stream': t.incomeSource || '',
      Tags: t.tags ? t.tags.join(', ') : '',
      'Has Receipt': t.receiptUrl ? 'Yes' : 'No'
    }));
    exportToExcelFile('LetsTrackIt_Ledger.xlsx', 'Ledger', data);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const data = filteredData.map(t => ({
      Date: t.date,
      Type: t.type,
      Title: t.purpose,
      'Personal Note': t.description || '',
      Category: t.category,
      Amount: t.amount,
      Mode: t.mode,
      Platform: t.platform,
      'Income Stream': t.incomeSource || '',
      Tags: t.tags ? t.tags.join(', ') : ''
    }));
    exportToCSV('LetsTrackIt_Ledger.csv', data);
  };

  // Export as Image
  const exportToImage = async () => {
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current, { 
        backgroundColor: '#081622' 
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "LetsTrackIt_Ledger_Snapshot.png";
      link.click();
    }
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-4">
      {/* Date Slicer & Type Filter Row */}
      <div className="glass-card p-4 rounded-3xl border border-[#143652] flex flex-wrap gap-3 items-center justify-between shadow-sm bg-[#081622]">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Type Filter */}
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-[#050E17] border border-[#143652] text-[#FCFFFF] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#FC734D] cursor-pointer"
          >
            <option value="ALL">All Entries</option>
            <option value="EXPENSE">Expenses Only (Debits)</option>
            <option value="INCOME">Income Only (Credits)</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#050E17] border border-[#143652] text-[#FCFFFF] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#FC734D] cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {Object.values(Category).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Sort Switcher */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#050E17] border border-[#143652] text-[#8397AB] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0297DE] cursor-pointer"
          >
            <option value="DATE_DESC">Newest First</option>
            <option value="DATE_ASC">Oldest First</option>
            <option value="AMOUNT_DESC">Highest Amount</option>
            <option value="AMOUNT_ASC">Lowest Amount</option>
          </select>
          
          {/* Date Slicer */}
          <div className="flex items-center gap-2 bg-[#050E17] px-3 py-1.5 rounded-xl border border-[#143652]">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#8397AB] font-extrabold uppercase">From</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[#FCFFFF] text-xs focus:outline-none font-sans" 
              />
            </div>
            <div className="w-px h-4 bg-[#143652]"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#8397AB] font-extrabold uppercase">To</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[#FCFFFF] text-xs focus:outline-none font-sans" 
              />
            </div>
            {(startDate || endDate) && (
              <button onClick={clearDateFilter} className="ml-1 p-0.5 rounded-full hover:bg-[#143652] text-[#8397AB] hover:text-[#FC734D]">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={handleExportExcel} 
            title="Export to Excel (.xlsx)" 
            className="p-2 bg-[#050E17] border border-[#143652] text-[#8397AB] rounded-xl hover:text-[#22C58B] hover:border-[#22C58B]/50 transition-colors"
          >
            <FileSpreadsheet size={16} />
          </button>
          <button 
            onClick={handleExportCSV} 
            title="Export to CSV" 
            className="p-2 bg-[#050E17] border border-[#143652] text-[#8397AB] rounded-xl hover:text-[#0297DE] hover:border-[#0297DE]/50 transition-colors"
          >
            <FileText size={16} />
          </button>
          <button 
            onClick={exportToImage} 
            title="Snapshot as Image" 
            className="p-2 bg-[#050E17] border border-[#143652] text-[#8397AB] rounded-xl hover:text-[#FC734D] hover:border-[#FC734D]/50 transition-colors"
          >
            <ImageIcon size={16} />
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="dashboard-card overflow-hidden border border-[#143652] bg-[#081622] rounded-3xl shadow-sm" ref={tableRef}>
        <div className="p-5 border-b border-[#143652] flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3 self-start md:self-center">
            <div className="p-2 bg-[#FC734D]/15 text-[#FC734D] rounded-xl border border-[#FC734D]/30">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#FCFFFF]">
                {typeFilter === 'EXPENSE' ? 'Expense History (Debits)' : (typeFilter === 'INCOME' ? 'Income Stream Credits' : 'Transactions Ledger')}
              </h3>
              <p className="text-xs text-[#8397AB]">{filteredData.length} records matching filter</p>
            </div>
          </div>
          
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8397AB] group-focus-within:text-[#FC734D] transition-colors" size={15} />
            <input 
              type="text" 
              placeholder="Search title, note, tag, bank..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#050E17] border border-[#143652] rounded-xl text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D] transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#050E17] text-[#8397AB] uppercase font-extrabold text-[10px] tracking-wider border-b border-[#143652]">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Transaction Details & Personal Notes</th>
                <th className="px-5 py-3">Payment Mode</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Receipt</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#143652]">
              {filteredData.map((t) => {
                const isIncome = t.type === TransactionType.INCOME;
                return (
                  <tr 
                    key={t.id} 
                    className="hover:bg-[#0D2235]/60 transition-colors group"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap text-[#8397AB] font-mono text-xs align-top">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-5 py-3.5 align-top">
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${isIncome ? 'bg-[#0297DE]/15 text-[#0297DE]' : 'bg-[#FC734D]/15 text-[#FC734D]'}`}>
                          {isIncome ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#FCFFFF]">{t.purpose}</span>
                            {t.incomeSource && (
                              <span className="px-2 py-0.2 rounded bg-[#0297DE]/15 text-[10px] font-bold text-[#0297DE] flex items-center gap-1">
                                <Briefcase size={10} /> {t.incomeSource}
                              </span>
                            )}
                          </div>

                          {/* Personal sentence / note */}
                          {t.description && (
                            <p className="text-xs text-[#8397AB] italic">
                              "{t.description}"
                            </p>
                          )}

                          {/* Tags */}
                          {t.tags && t.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {t.tags.map(tag => (
                                <span key={tag} className="px-1.5 py-0.2 rounded bg-[#143652] text-[10px] text-[#8397AB]">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {t.shoppingDetails && (
                            <div className="mt-2 bg-[#050E17] p-2 rounded-xl border border-[#143652] text-[11px] text-[#8397AB] max-w-sm">
                              <span className="text-[#0297DE] font-bold block mb-0.5">📦 Delivery Order Details</span>
                              <span>{t.shoppingDetails.appName} • {t.shoppingDetails.productName} ({t.shoppingDetails.status})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#8397AB] align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="bg-[#050E17] border border-[#143652] px-2 py-0.5 rounded text-[11px] font-semibold text-[#FCFFFF] w-fit">
                          {t.platform || 'General'}
                        </span>
                        <span className="text-[9px] text-[#8397AB] uppercase font-bold">{t.mode}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 align-top">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-[#050E17] text-[#8397AB] border border-[#143652]">
                        {t.category}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-right font-black font-mono text-sm align-top ${isIncome ? 'text-[#0297DE]' : 'text-[#FC734D]'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(t.amount, currencyPreference, isConfidential)}
                    </td>
                    <td className="px-5 py-3.5 text-center align-top">
                      {t.receiptUrl ? (
                        <button
                          onClick={() => setPreviewReceipt(t.receiptUrl!)}
                          title="View attached receipt"
                          className="p-1 rounded-lg bg-[#050E17] hover:bg-[#0D2235] text-[#0297DE] border border-[#143652] transition-colors"
                        >
                          <Receipt size={14} />
                        </button>
                      ) : (
                        <span className="text-[#8397AB] opacity-30">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center align-top">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => onEdit(t)} 
                          className="p-1.5 rounded-lg hover:bg-[#0D2235] text-[#8397AB] hover:text-[#FCFFFF] transition-colors" 
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => onDelete(t.id)} 
                          className="p-1.5 rounded-lg hover:bg-[#FC734D]/20 text-[#8397AB] hover:text-[#FC734D] transition-colors" 
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-[#8397AB]">
                    <Filter size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-xs">No transactions match your search filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Image Preview Modal */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02070A]/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#081622] border border-[#143652] rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#143652] mb-3">
              <span className="text-sm font-bold text-[#FCFFFF] flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#0297DE]" />
                Attached Receipt Preview
              </span>
              <button onClick={() => setPreviewReceipt(null)} className="text-[#8397AB] hover:text-[#FCFFFF]">
                <X size={18} />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-[#050E17] border border-[#143652] max-h-[60vh] flex items-center justify-center">
              <img src={previewReceipt} alt="Receipt" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
