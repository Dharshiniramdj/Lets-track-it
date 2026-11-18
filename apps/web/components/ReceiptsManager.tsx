import React, { useState, useRef } from 'react';
import { ReceiptDocument, ReceiptSplit, Transaction, Category } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Split, 
  ExternalLink, 
  X, 
  Upload, 
  Tag, 
  Eye, 
  Check, 
  Calendar, 
  Store
} from 'lucide-react';

interface Props {
  receipts: ReceiptDocument[];
  transactions: Transaction[];
  onAddReceipt: (doc: Omit<ReceiptDocument, 'id' | 'createdAt'>) => void;
  onUpdateReceipt: (id: string, updates: Partial<ReceiptDocument>) => void;
  onDeleteReceipt: (id: string) => void;
  currencyPreference?: string;
  isConfidential?: boolean;
}

export const ReceiptsManager: React.FC<Props> = ({
  receipts,
  transactions,
  onAddReceipt,
  onUpdateReceipt,
  onDeleteReceipt,
  currencyPreference = 'INR',
  isConfidential = false
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewDoc, setPreviewDoc] = useState<ReceiptDocument | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState('');
  const [merchant, setMerchant] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(Category.GROCERY);
  const [tagsInput, setTagsInput] = useState('');
  const [personalNotes, setPersonalNotes] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<ReceiptDocument['fileType']>('RECEIPT');
  const [relatedTxId, setRelatedTxId] = useState('');

  // Splits State
  const [enableSplit, setEnableSplit] = useState(false);
  const [splits, setSplits] = useState<ReceiptSplit[]>([
    { category: Category.GROCERY, amount: 0, notes: 'Groceries portion' },
    { category: Category.FOOD, amount: 0, notes: 'Snacks & Beverages' }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Please upload a file smaller than 5MB.');
      return;
    }

    setFileName(file.name);
    const isImg = file.type.startsWith('image/');
    setFileType(isImg ? 'IMAGE' : file.type.includes('pdf') ? 'PDF' : 'INVOICE');

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setFileUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSplitRow = () => {
    setSplits(prev => [...prev, { category: Category.SHOPPING, amount: 0, notes: '' }]);
  };

  const handleUpdateSplit = (index: number, updates: Partial<ReceiptSplit>) => {
    setSplits(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const handleRemoveSplit = (index: number) => {
    setSplits(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    const totalAmt = parseFloat(amount) || 0;
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const docSplits = enableSplit && splits.length > 0
      ? splits.filter(s => s.amount > 0)
      : undefined;

    onAddReceipt({
      accountId: 'default',
      title: title.trim(),
      merchant: merchant.trim() || 'Store',
      transactionDate,
      amount: totalAmt,
      category,
      tags,
      personalNotes: personalNotes.trim() || undefined,
      fileUrl: fileUrl || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600',
      fileName: fileName || 'receipt_scan.jpg',
      fileType,
      relatedTransactionId: relatedTxId || undefined,
      splits: docSplits
    });

    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setMerchant('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setCategory(Category.GROCERY);
    setTagsInput('');
    setPersonalNotes('');
    setFileUrl('');
    setFileName('');
    setEnableSplit(false);
    setSplits([
      { category: Category.GROCERY, amount: 0, notes: 'Groceries portion' },
      { category: Category.FOOD, amount: 0, notes: 'Snacks & Beverages' }
    ]);
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesCat = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.merchant.toLowerCase().includes(search.toLowerCase()) ||
      (r.personalNotes && r.personalNotes.toLowerCase().includes(search.toLowerCase())) ||
      r.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalVaultValue = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card p-6 rounded-3xl border border-[#143652] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#143652]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FC734D]/15 border border-[#FC734D]/30 flex items-center justify-center text-[#FC734D]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FC734D]">
                Receipt & Document Vault
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#FCFFFF] mt-0.5">
                Financial Document Organizer & Category Splitter
              </h3>
              <p className="text-xs text-[#8397AB] mt-0.5">
                Attach receipt images, invoices, and split single receipts across multiple budget categories.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] text-[#02070A] text-xs font-black shadow-lg shadow-[#FC734D]/25 hover:scale-105 transition-all flex items-center gap-1.5 self-start md:self-center"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Upload Document / Receipt
          </button>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {['ALL', Category.GROCERY, Category.SHOPPING, Category.FOOD, Category.BILLS, Category.HEALTH].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#0297DE] text-[#02070A]'
                    : 'bg-[#050E17] text-[#8397AB] hover:text-[#FCFFFF] border border-[#143652]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8397AB] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search merchant, tag, note..."
              className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
            />
          </div>
        </div>
      </div>

      {/* Receipts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReceipts.length === 0 ? (
          <div className="col-span-full text-center py-12 rounded-3xl bg-[#081622] border border-dashed border-[#143652]">
            <Receipt className="w-10 h-10 text-[#8397AB] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-[#FCFFFF]">No documents found in vault</p>
            <p className="text-xs text-[#8397AB] mt-0.5">Click "Upload Document / Receipt" to archive invoices and receipts.</p>
          </div>
        ) : (
          filteredReceipts.map(doc => (
            <div
              key={doc.id}
              className="glass-card rounded-3xl border border-[#143652] hover:border-[#0297DE]/50 transition-all overflow-hidden flex flex-col justify-between"
            >
              {/* Image Preview Top */}
              <div 
                onClick={() => setPreviewDoc(doc)}
                className="h-36 bg-[#050E17] relative cursor-pointer group overflow-hidden flex items-center justify-center border-b border-[#143652]"
              >
                {doc.fileUrl ? (
                  <img
                    src={doc.fileUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <FileText className="w-12 h-12 text-[#8397AB]/40" />
                )}
                <div className="absolute inset-0 bg-[#02070A]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-bold text-[#FCFFFF]">
                  <Eye className="w-4 h-4" />
                  Preview Receipt
                </div>
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#02070A]/80 backdrop-blur-md text-[10px] font-bold text-[#0297DE] border border-[#143652]">
                  {doc.fileType}
                </span>
              </div>

              {/* Document Details */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-[#FC734D] tracking-wider">
                      {doc.category}
                    </span>
                    <span className="text-xs text-[#8397AB]">{formatDate(doc.transactionDate)}</span>
                  </div>

                  <h4 className="font-extrabold text-sm text-[#FCFFFF] mt-1">{doc.title}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-[#8397AB] mt-0.5">
                    <Store className="w-3.5 h-3.5" />
                    <span>{doc.merchant}</span>
                  </div>

                  {doc.personalNotes && (
                    <p className="text-[11px] text-[#8397AB] mt-1.5 italic line-clamp-2">
                      "{doc.personalNotes}"
                    </p>
                  )}

                  {/* Multi-category Split Badge preview */}
                  {doc.splits && doc.splits.length > 0 && (
                    <div className="mt-2 p-2 rounded-xl bg-[#050E17] border border-[#143652] space-y-1">
                      <span className="text-[10px] font-bold text-[#0297DE] flex items-center gap-1">
                        <Split className="w-3 h-3" />
                        Split Across {doc.splits.length} Categories:
                      </span>
                      {doc.splits.map((s, idx) => (
                        <div key={idx} className="flex justify-between text-[10px] text-[#8397AB]">
                          <span>{s.category}</span>
                          <span className="font-bold text-[#FCFFFF]">
                            {formatCurrency(s.amount, currencyPreference, isConfidential)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.2 rounded bg-[#143652] text-[10px] text-[#8397AB]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Price & Actions */}
                <div className="pt-3 border-t border-[#143652] flex items-center justify-between">
                  <span className="text-base font-black text-[#FCFFFF]">
                    {formatCurrency(doc.amount, currencyPreference, isConfidential)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="p-1.5 rounded-lg bg-[#050E17] hover:bg-[#0D2235] text-[#8397AB] hover:text-[#FCFFFF]"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteReceipt(doc.id)}
                      className="p-1.5 rounded-lg bg-[#050E17] hover:bg-[#FC734D]/20 text-[#8397AB] hover:text-[#FC734D]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload & Split Receipt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02070A]/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#081622] border border-[#143652] rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#143652] mb-4">
              <h3 className="text-base font-extrabold text-[#FCFFFF] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#FC734D]" />
                Upload Document & Receipt
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#8397AB] hover:text-[#FCFFFF]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* File Upload Box */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Receipt Image or PDF Scan
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-[#143652] hover:border-[#FC734D] rounded-2xl bg-[#050E17] text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-6 h-6 text-[#8397AB] mx-auto mb-1" />
                  <span className="text-xs font-bold text-[#FCFFFF] block">
                    {fileName || 'Click to upload receipt image or invoice'}
                  </span>
                  <span className="text-[10px] text-[#8397AB]">Supports JPG, PNG, WebP, PDF (up to 5MB)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Supermarket Monthly Bulk"
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Merchant / Store
                  </label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={e => setMerchant(e.target.value)}
                    placeholder="e.g. Costco, BigBasket, Zepto"
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Total Receipt Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Total amount"
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={e => setTransactionDate(e.target.value)}
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  />
                </div>
              </div>

              {/* Advanced Multi-Category Receipt Splitting */}
              <div className="p-3.5 rounded-2xl bg-[#050E17] border border-[#143652] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#FCFFFF] flex items-center gap-1.5">
                      <Split className="w-4 h-4 text-[#0297DE]" />
                      Split Receipt Across Multiple Categories
                    </span>
                    <p className="text-[10px] text-[#8397AB]">
                      e.g., ₹3,000 grocery bill split into ₹2,000 groceries and ₹1,000 household items
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableSplit}
                    onChange={e => setEnableSplit(e.target.checked)}
                    className="w-4 h-4 text-[#0297DE] rounded"
                  />
                </div>

                {enableSplit && (
                  <div className="space-y-2 pt-2 border-t border-[#143652]">
                    {splits.map((split, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2 items-center">
                        <select
                          value={split.category}
                          onChange={e => handleUpdateSplit(i, { category: e.target.value })}
                          className="bg-[#081622] border border-[#143652] rounded-lg px-2 py-1.5 text-xs text-[#FCFFFF]"
                        >
                          {Object.values(Category).filter(c => c !== Category.INCOME).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={split.amount || ''}
                          onChange={e => handleUpdateSplit(i, { amount: parseFloat(e.target.value) || 0 })}
                          placeholder="Amount"
                          className="bg-[#081622] border border-[#143652] rounded-lg px-2 py-1.5 text-xs text-[#FCFFFF]"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={split.notes || ''}
                            onChange={e => handleUpdateSplit(i, { notes: e.target.value })}
                            placeholder="Sub-item notes"
                            className="bg-[#081622] border border-[#143652] rounded-lg px-2 py-1.5 text-xs text-[#FCFFFF] w-full"
                          />
                          {splits.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSplit(i)}
                              className="text-[#8397AB] hover:text-[#FC734D] p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddSplitRow}
                      className="text-xs text-[#0297DE] hover:text-[#38BDF8] font-bold flex items-center gap-1 mt-1"
                    >
                      + Add Category Split
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="e.g. tax, supermarket, electronics, business-expense"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Personal Sentence / Notes
                </label>
                <input
                  type="text"
                  value={personalNotes}
                  onChange={e => setPersonalNotes(e.target.value)}
                  placeholder="e.g. Bought groceries for the week at the supermarket."
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D2235] text-xs font-bold text-[#8397AB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-xs font-black text-[#02070A]"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Full Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02070A]/90 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#081622] border border-[#143652] rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#143652] mb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#FCFFFF]">{previewDoc.title}</h3>
                <p className="text-xs text-[#8397AB]">{previewDoc.merchant} • {formatDate(previewDoc.transactionDate)}</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-[#8397AB] hover:text-[#FCFFFF]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-[#050E17] border border-[#143652] p-2 flex items-center justify-center mb-4">
              {previewDoc.fileUrl ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-[60vh] max-w-full object-contain rounded-xl"
                />
              ) : (
                <div className="text-center py-10 text-xs text-[#8397AB]">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-[#8397AB]/50" />
                  PDF document preview
                </div>
              )}
            </div>

            {previewDoc.splits && previewDoc.splits.length > 0 && (
              <div className="p-3 rounded-xl bg-[#050E17] border border-[#143652] mb-3 space-y-1">
                <span className="text-xs font-bold text-[#0297DE]">Category Breakdown:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {previewDoc.splits.map((s, idx) => (
                    <div key={idx} className="flex justify-between text-[#8397AB]">
                      <span>{s.category}:</span>
                      <span className="font-bold text-[#FCFFFF]">{formatCurrency(s.amount, currencyPreference, isConfidential)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-xs">
              <span className="font-black text-lg text-[#FCFFFF]">
                Total: {formatCurrency(previewDoc.amount, currencyPreference, isConfidential)}
              </span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl bg-[#0D2235] text-xs font-bold text-[#FCFFFF]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
