import React, { useState, useEffect, useRef } from 'react';
import { 
  Transaction, 
  TransactionType, 
  PaymentMode, 
  Category, 
  ShoppingDetails, 
  IncomeSource 
} from '../types';
import { getCurrencySymbol } from '../utils/formatters';
import { 
  Plus, 
  X, 
  Receipt, 
  ShoppingBag, 
  Save, 
  Wand2, 
  ArrowDownRight, 
  ArrowUpRight, 
  Tag, 
  Upload, 
  TrendingUp, 
  Repeat,
  FileText
} from 'lucide-react';

interface Props {
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'accountId'>) => void;
  onCancel: () => void;
  initialMode?: 'DEFAULT' | 'SHOPPING';
  initialData?: Transaction;
  history?: Transaction[];
  incomeSources?: IncomeSource[];
  currencyPreference?: string;
}

const TransactionForm: React.FC<Props> = ({ 
  onSave, 
  onCancel, 
  initialMode = 'DEFAULT', 
  initialData, 
  history = [],
  incomeSources = [],
  currencyPreference = 'INR'
}) => {
  const [showShopping, setShowShopping] = useState(initialMode === 'SHOPPING');
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [mode, setMode] = useState<PaymentMode>(PaymentMode.UPI);
  const [platform, setPlatform] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState(''); // Personal sentence / note
  const [category, setCategory] = useState<Category>(initialMode === 'SHOPPING' ? Category.SHOPPING : Category.OTHERS);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tagsInput, setTagsInput] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');

  // Multiple Income Sources fields
  const [incomeSource, setIncomeSource] = useState('Salary');
  const [isRecurringIncome, setIsRecurringIncome] = useState(false);

  // Shopping State
  const [appName, setAppName] = useState('');
  const [productName, setProductName] = useState('');
  const [forWhom, setForWhom] = useState('Self');
  const [orderedDate, setOrderedDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState<'ORDERED' | 'DELIVERED'>('ORDERED');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currSymbol = getCurrencySymbol(currencyPreference);

  // Load Initial Data for Editing
  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setMode(initialData.mode);
      setPlatform(initialData.platform);
      setPurpose(initialData.purpose);
      setDescription(initialData.description || '');
      setCategory(initialData.category);
      setDate(initialData.date);
      setTagsInput(initialData.tags ? initialData.tags.join(', ') : '');
      setReceiptUrl(initialData.receiptUrl || '');
      setIncomeSource(initialData.incomeSource || 'Salary');
      setIsRecurringIncome(!!initialData.isRecurring);

      if (initialData.shoppingDetails || initialData.category === Category.SHOPPING) {
        setShowShopping(true);
        if (initialData.shoppingDetails) {
          setAppName(initialData.shoppingDetails.appName);
          setProductName(initialData.shoppingDetails.productName);
          setForWhom(initialData.shoppingDetails.forWhom);
          setOrderedDate(initialData.shoppingDetails.orderedDate);
          setDeliveryDate(initialData.shoppingDetails.deliveryDate);
          setStatus(initialData.shoppingDetails.status as any);
        }
      }
    } else if (initialMode === 'SHOPPING') {
      setShowShopping(true);
      setCategory(Category.SHOPPING);
    }
  }, [initialData, initialMode]);

  // Smart Category Auto-Suggest
  const handlePurposeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPurpose(val);
    setIsAutoFilled(false);

    if (!initialData && val.length > 2) {
      const match = history.find(t => 
        t.purpose.toLowerCase() === val.toLowerCase() || 
        t.purpose.toLowerCase().includes(val.toLowerCase())
      );
      if (match) {
        setCategory(match.category);
        setType(match.type);
        setMode(match.mode);
        setPlatform(match.platform);
        setIsAutoFilled(true);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File must be smaller than 5MB');
      return;
    }

    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setReceiptUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !purpose.trim()) return;
    
    let shoppingDetails: ShoppingDetails | undefined = undefined;
    if (showShopping) {
      shoppingDetails = {
        appName,
        productName,
        forWhom,
        orderedDate,
        deliveryDate,
        status: status as any
      };
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    onSave({
      amount: parseFloat(amount),
      type,
      mode,
      platform,
      purpose: purpose.trim(),
      description: description.trim() || undefined,
      category,
      date,
      tags: tags.length > 0 ? tags : undefined,
      receiptUrl: receiptUrl || undefined,
      incomeSource: type === TransactionType.INCOME ? incomeSource : undefined,
      isRecurring: type === TransactionType.INCOME ? isRecurringIncome : undefined,
      shoppingDetails
    });
  };

  return (
    <div className="bg-[#081622] rounded-3xl shadow-2xl p-6 md:p-8 max-w-2xl mx-auto border border-[#143652] relative text-[#FCFFFF] max-h-[90vh] overflow-y-auto custom-scrollbar">
      {/* Modal Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-[#FCFFFF] tracking-tight">
            {initialData ? 'Edit Transaction' : (initialMode === 'SHOPPING' ? 'Log Order Delivery' : 'Record Transaction')}
          </h2>
          <p className="text-xs text-[#8397AB] mt-0.5">
            {initialData ? 'Modify financial attributes and personal notes' : 'Add incoming or outgoing transaction with full personal context'}
          </p>
        </div>
        <button 
          onClick={onCancel} 
          className="p-2 rounded-xl bg-[#050E17] hover:bg-[#0D2235] text-[#8397AB] hover:text-[#FCFFFF] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Toggle: Income vs Expense */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-[#050E17] rounded-2xl border border-[#143652]">
          <button
            type="button"
            onClick={() => {
              setType(TransactionType.EXPENSE);
              if (category === Category.INCOME) setCategory(Category.OTHERS);
            }}
            className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              type === TransactionType.EXPENSE
                ? 'bg-[#FC734D] text-[#02070A] shadow-md shadow-[#FC734D]/25 font-black'
                : 'text-[#8397AB] hover:text-[#FCFFFF]'
            }`}
          >
            <ArrowUpRight size={16} /> Outflow Expense (Debit)
          </button>
          <button
            type="button"
            onClick={() => {
              setType(TransactionType.INCOME);
              setCategory(Category.INCOME);
            }}
            className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              type === TransactionType.INCOME
                ? 'bg-[#0297DE] text-[#02070A] shadow-md shadow-[#0297DE]/25 font-black'
                : 'text-[#8397AB] hover:text-[#FCFFFF]'
            }`}
          >
            <ArrowDownRight size={16} /> Inflow Income (Credit)
          </button>
        </div>

        {/* If Income: Multi-Stream Source Selection */}
        {type === TransactionType.INCOME && (
          <div className="p-4 rounded-2xl bg-[#0297DE]/10 border border-[#0297DE]/30 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#0297DE] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Income Stream Classification
              </span>
              <label className="flex items-center gap-1.5 text-xs text-[#8397AB] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurringIncome}
                  onChange={e => setIsRecurringIncome(e.target.checked)}
                  className="rounded border-[#143652] text-[#0297DE]"
                />
                <span>Recurring Monthly</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#8397AB] mb-1">
                  Source Name / Employer
                </label>
                <input
                  type="text"
                  value={incomeSource}
                  onChange={e => setIncomeSource(e.target.value)}
                  placeholder="e.g. Salary, Client Retainer, Dividends"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#8397AB] mb-1">
                  Or pick active source
                </label>
                <select
                  onChange={e => e.target.value && setIncomeSource(e.target.value)}
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF]"
                >
                  <option value="">-- Existing Streams --</option>
                  {incomeSources.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({currSymbol}{s.amount})</option>
                  ))}
                  <option value="Primary Salary">Primary Salary</option>
                  <option value="Freelancing Work">Freelancing Work</option>
                  <option value="Part-time Gig">Part-time Gig</option>
                  <option value="Business Revenue">Business Revenue</option>
                  <option value="Investments & Dividends">Investments & Dividends</option>
                  <option value="Rental Yield">Rental Yield</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Core Transaction Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-[#8397AB] uppercase tracking-wider mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-[#8397AB] font-mono text-xl">
                {currSymbol}
              </span>
              <input
                required
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="transaction-amount-input"
                className="w-full pl-9 pr-4 py-3 bg-[#050E17] border border-[#143652] rounded-xl focus:outline-none focus:border-[#FC734D] text-xl font-bold font-mono text-[#FCFFFF] placeholder-[#8397AB]"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-extrabold text-[#8397AB] uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-[#050E17] border border-[#143652] rounded-xl focus:outline-none focus:border-[#FC734D] text-[#FCFFFF] text-sm"
            />
          </div>
        </div>

        {/* Purpose / Title */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-extrabold text-[#8397AB] uppercase tracking-wider">
              Transaction Title
            </label>
            {isAutoFilled && (
              <span className="text-[11px] text-[#0297DE] flex items-center gap-1 font-semibold">
                <Wand2 size={11}/> Auto-suggested
              </span>
            )}
          </div>
          <input
            required
            type="text"
            value={purpose}
            onChange={handlePurposeChange}
            placeholder="e.g. Supermarket, Shell Petrol, Apple Store, Client Retainer"
            data-testid="transaction-purpose-input"
            className="w-full px-4 py-2.5 bg-[#050E17] border border-[#143652] rounded-xl focus:outline-none focus:border-[#FC734D] text-[#FCFFFF] text-sm"
          />
        </div>

        {/* Sentence / Personal Note */}
        <div>
          <label className="block text-xs font-extrabold text-[#8397AB] uppercase tracking-wider mb-1.5">
            Sentence / Personal Note
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Bought groceries for the week at the supermarket."
            className="w-full px-4 py-2.5 bg-[#050E17] border border-[#143652] rounded-xl focus:outline-none focus:border-[#FC734D] text-[#FCFFFF] text-sm placeholder-[#5A688A]"
          />
        </div>

        {/* Category, Mode, Platform */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-extrabold text-[#8397AB] uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              data-testid="transaction-category-select"
              className="w-full px-3 py-2.5 bg-[#050E17] border border-[#143652] rounded-xl focus:outline-none focus:border-[#FC734D] text-[#FCFFFF] text-xs cursor-pointer"
            >
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-extrabold text-[#8397AB] uppercase tracking-wider mb-1.5">
              Payment Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PaymentMode)}
              className="w-full px-3 py-2.5 bg-[#050E17] border border-[#143652] rounded-xl focus:outline-none focus:border-[#FC734D] text-[#FCFFFF] text-xs cursor-pointer"
            >
              {Object.values(PaymentMode).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-extrabold text-[#8397AB] uppercase tracking-wider mb-1.5">
              Platform / Store
            </label>
            <input
              type="text"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="e.g. GPay, HDFC, Amazon"
              className="w-full px-3 py-2.5 bg-[#050E17] border border-[#143652] rounded-xl focus:outline-none focus:border-[#FC734D] text-[#FCFFFF] text-xs"
            />
          </div>
        </div>

        {/* Tags & Receipt Attachment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-extrabold text-[#8397AB] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Tags
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="#groceries, #weekly, #tax"
              className="w-full px-3 py-2 bg-[#050E17] border border-[#143652] rounded-xl text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-[#8397AB] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" /> Attach Receipt
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-3 py-2 rounded-xl bg-[#050E17] border border-[#143652] hover:border-[#FC734D] text-xs text-[#8397AB] hover:text-[#FCFFFF] text-left truncate transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-[#FC734D]" />
                <span className="truncate">{receiptFileName || (receiptUrl ? 'Receipt Attached' : 'Upload scan...')}</span>
              </button>
              {receiptUrl && (
                <button
                  type="button"
                  onClick={() => { setReceiptUrl(''); setReceiptFileName(''); }}
                  className="px-2 py-1 rounded-lg bg-[#050E17] hover:bg-[#FC734D]/20 text-[#8397AB] hover:text-[#FC734D]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Shopping / Delivery Toggle */}
        <div className="flex items-center gap-3 pt-2">
          <input 
            type="checkbox" 
            id="shopping-toggle" 
            checked={showShopping} 
            onChange={(e) => setShowShopping(e.target.checked)}
            className="w-4 h-4 rounded border-[#143652] bg-[#050E17] text-[#FC734D] focus:ring-0 cursor-pointer"
          />
          <label htmlFor="shopping-toggle" className="text-xs font-semibold text-[#8397AB] hover:text-[#FCFFFF] select-none cursor-pointer flex items-center gap-2">
            <ShoppingBag size={14} className="text-[#FC734D]" /> Attach Online Order / Delivery Item
          </label>
        </div>

        {/* Extended Shopping Form */}
        {showShopping && (
          <div className="bg-[#050E17] p-4 rounded-2xl border border-[#143652] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#8397AB] mb-1">Store / App</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Amazon, Zepto, Blinkit..."
                  className="w-full px-3 py-2 bg-[#081622] border border-[#143652] rounded-xl text-xs text-[#FCFFFF]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#8397AB] mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Wireless Mouse"
                  className="w-full px-3 py-2 bg-[#081622] border border-[#143652] rounded-xl text-xs text-[#FCFFFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#8397AB] mb-1">For Whom</label>
                <input
                  type="text"
                  value={forWhom}
                  onChange={(e) => setForWhom(e.target.value)}
                  placeholder="Self, Home, Mom"
                  className="w-full px-3 py-2 bg-[#081622] border border-[#143652] rounded-xl text-xs text-[#FCFFFF]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#8397AB] mb-1">Ordered Date</label>
                <input
                  type="date"
                  value={orderedDate}
                  onChange={(e) => setOrderedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#081622] border border-[#143652] rounded-xl text-xs text-[#FCFFFF]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#8397AB] mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#081622] border border-[#143652] rounded-xl text-xs text-[#FCFFFF]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-[#143652]">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-[#050E17] hover:bg-[#0D2235] text-xs font-bold text-[#8397AB] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] text-[#02070A] text-xs font-black shadow-lg shadow-[#FC734D]/25 hover:scale-105 transition-all flex items-center gap-1.5"
          >
            <Save size={16} />
            {initialData ? 'Update Record' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
