import React, { useState } from 'react';
import { 
  UserProfile, 
  IncomeSource, 
  FeatureToggles, 
  DashboardWidgetConfig,
  Category
} from '../types';
import { getCurrencySymbol } from '../utils/formatters';
import { 
  User, 
  Briefcase, 
  TrendingUp, 
  Wallet, 
  Target, 
  Layers, 
  ShieldCheck, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Sparkles,
  Eye,
  EyeOff,
  Bell,
  Clock,
  Package,
  FileSpreadsheet
} from 'lucide-react';

interface Props {
  initialProfile: UserProfile;
  initialIncomeSources?: IncomeSource[];
  initialToggles?: FeatureToggles;
  initialWidgets?: DashboardWidgetConfig;
  onComplete: (data: {
    profile: UserProfile;
    incomeSources: IncomeSource[];
    toggles: FeatureToggles;
    widgets: DashboardWidgetConfig;
    categoriesBudget?: Record<string, number>;
  }) => void;
  onSkip: () => void;
}

const DEFAULT_TOGGLES: FeatureToggles = {
  manualTrackingOnly: true,
  billsTracker: true,
  savingsGoals: true,
  spendingInsights: true,
  alertsAndNotifications: true,
  sharedBudgets: false,
  simpleMode: false,
  confidentialPrivacyMode: false,
  biometricLock: false,
};

const DEFAULT_WIDGETS: DashboardWidgetConfig = {
  totalBalance: true,
  monthlyIncome: true,
  monthlyExpenses: true,
  netSavings: true,
  savingsProgress: true,
  upcomingBills: true,
  upcomingDeliveries: true,
  recentTransactions: true,
  monthlySpendingChart: true,
  incomeVsExpenseChart: true,
  financialInsights: true,
};

export const OnboardingWizard: React.FC<Props> = ({
  initialProfile,
  initialIncomeSources = [],
  initialToggles,
  initialWidgets,
  onComplete,
  onSkip
}) => {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 4;

  // Step 1: Profile & Status
  const [name, setName] = useState(initialProfile.name || '');
  const [currency, setCurrency] = useState(initialProfile.currencyPreference || 'INR');
  const [employmentStatus, setEmploymentStatus] = useState<string>(
    initialProfile.employmentStatus || 'Employed Full-Time'
  );

  // Step 2: Income & Sources
  const [sources, setSources] = useState<Array<{ name: string; amount: number; category: string; isRecurring: boolean }>>(() => {
    if (initialIncomeSources.length > 0) {
      return initialIncomeSources.map(s => ({
        name: s.name,
        amount: s.amount,
        category: s.category,
        isRecurring: s.isRecurring
      }));
    }
    return [
      { name: 'Primary Career / Job', amount: 75000, category: 'Salary', isRecurring: true }
    ];
  });
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceAmount, setNewSourceAmount] = useState('');
  const [newSourceCategory, setNewSourceCategory] = useState('Freelance');

  const totalIncomeCalculated = sources.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Step 3: Financial Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>(() => {
    return initialProfile.financialGoals && initialProfile.financialGoals.length > 0
      ? initialProfile.financialGoals
      : ['Emergency Cushion (6 Months)', 'Grow Liquid Savings'];
  });

  const GOAL_OPTIONS = [
    'Emergency Cushion (6 Months)',
    'Zero Credit Debt Payoff',
    'Grow Liquid Savings',
    'Tech & Equipment Upgrades',
    'Travel & Vacation Fund',
    'Investments & Retirement'
  ];

  // Step 4: Feature Toggles & Preferences
  const [toggles, setToggles] = useState<FeatureToggles>(initialToggles || DEFAULT_TOGGLES);
  const [widgets, setWidgets] = useState<DashboardWidgetConfig>(initialWidgets || DEFAULT_WIDGETS);

  const currSymbol = getCurrencySymbol(currency);

  const handleAddSource = () => {
    if (!newSourceName.trim() || !newSourceAmount) return;
    setSources(prev => [
      ...prev,
      {
        name: newSourceName.trim(),
        amount: parseFloat(newSourceAmount) || 0,
        category: newSourceCategory,
        isRecurring: true
      }
    ]);
    setNewSourceName('');
    setNewSourceAmount('');
  };

  const handleRemoveSource = (index: number) => {
    setSources(prev => prev.filter((_, i) => i !== index));
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const handleFinish = () => {
    const updatedProfile: UserProfile = {
      ...initialProfile,
      name: name.trim() || initialProfile.name,
      currencyPreference: currency,
      employmentStatus,
      monthlyIncome: totalIncomeCalculated,
      financialGoals: selectedGoals,
      onboardingCompleted: true,
      trackingPreferences: toggles
    };

    const incomeSourceEntities: IncomeSource[] = sources.map((s, idx) => ({
      id: `inc-src-${Date.now()}-${idx}`,
      accountId: 'default',
      name: s.name,
      amount: s.amount,
      date: new Date().toISOString().split('T')[0],
      category: s.category,
      isRecurring: s.isRecurring,
      recurrenceFrequency: 'MONTHLY',
      createdAt: Date.now()
    }));

    onComplete({
      profile: updatedProfile,
      incomeSources: incomeSourceEntities,
      toggles,
      widgets
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02070A]/85 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-[#081622] border border-[#143652] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-[#143652] flex items-center justify-between bg-[#050E17]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FC734D] to-[#0297DE] flex items-center justify-center text-[#02070A] font-black text-sm">
              {step}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#FCFFFF]">
                {step === 1 && 'Welcome & Identity'}
                {step === 2 && 'Income & Revenue Streams'}
                {step === 3 && 'Target Financial Goals'}
                {step === 4 && 'Feature Controls & Dashboard Layout'}
              </h2>
              <p className="text-xs text-[#8397AB]">
                Step {step} of {totalSteps} • Personalize your Let's Track It workspace
              </p>
            </div>
          </div>

          <button
            onClick={onSkip}
            className="text-xs font-semibold text-[#8397AB] hover:text-[#FCFFFF] px-3 py-1.5 rounded-lg hover:bg-[#0D2235] transition-colors"
          >
            Skip for now
          </button>
        </div>

        {/* Step Progress Line */}
        <div className="w-full bg-[#050E17] h-1.5 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#FC734D] to-[#0297DE] transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step Content Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: Identity & Currency */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] text-xs text-[#8397AB] leading-relaxed">
                Welcome! Let's tailor the tracker to your personal workflow. Your data stays 100% confidential and encrypted on your device.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1.5">
                  Your Name or Moniker
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8397AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Alex Vance"
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1.5">
                    Preferred Currency
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2.5 text-sm text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  >
                    <option value="INR">₹ INR (Indian Rupee)</option>
                    <option value="USD">$ USD (US Dollar)</option>
                    <option value="EUR">€ EUR (Euro)</option>
                    <option value="GBP">£ GBP (British Pound)</option>
                    <option value="JPY">¥ JPY (Japanese Yen)</option>
                    <option value="CAD">C$ CAD (Canadian Dollar)</option>
                    <option value="AUD">A$ AUD (Australian Dollar)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1.5">
                    Employment / Student Status
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-[#8397AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={employmentStatus}
                      onChange={e => setEmploymentStatus(e.target.value)}
                      className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-3 py-2.5 text-sm text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                    >
                      <option value="Employed Full-Time">Employed Full-Time</option>
                      <option value="Self-Employed / Founder">Self-Employed / Founder</option>
                      <option value="Freelancer / Consultant">Freelancer / Consultant</option>
                      <option value="Student">Student</option>
                      <option value="Homemaker">Homemaker</option>
                      <option value="Investor / Retired">Investor / Retired</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Multiple Income Sources */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#FCFFFF]">Active Income Streams</h3>
                  <p className="text-xs text-[#8397AB]">Track multiple income sources in the same calendar month.</p>
                </div>
                <span className="text-xs font-black text-[#0297DE] px-3 py-1 rounded-full bg-[#0297DE]/15 border border-[#0297DE]/30">
                  Total: {currSymbol}{totalIncomeCalculated.toLocaleString()}
                </span>
              </div>

              {/* Existing Sources List */}
              <div className="space-y-2">
                {sources.map((src, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#050E17] border border-[#143652]"
                  >
                    <div>
                      <span className="font-bold text-sm text-[#FCFFFF]">{src.name}</span>
                      <div className="text-[11px] text-[#8397AB] flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#143652] text-[10px] text-[#0297DE]">
                          {src.category}
                        </span>
                        <span>Monthly Recurring</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-sm text-[#0297DE]">
                        {currSymbol}{src.amount.toLocaleString()}
                      </span>
                      {sources.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSource(idx)}
                          className="p-1 hover:text-[#FC734D] text-[#8397AB] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Income Stream Row */}
              <div className="p-3.5 rounded-2xl bg-[#0D2235]/40 border border-[#143652] space-y-3">
                <span className="text-xs font-bold text-[#FCFFFF] flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#FC734D]" />
                  Add Another Income Stream (Freelance, Side Gig, Dividends)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newSourceName}
                    onChange={e => setNewSourceName(e.target.value)}
                    placeholder="e.g. Freelance Consulting"
                    className="bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF]"
                  />
                  <input
                    type="number"
                    value={newSourceAmount}
                    onChange={e => setNewSourceAmount(e.target.value)}
                    placeholder={`Amount (${currSymbol})`}
                    className="bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF]"
                  />
                  <select
                    value={newSourceCategory}
                    onChange={e => setNewSourceCategory(e.target.value)}
                    className="bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF]"
                  >
                    <option value="Freelance">Freelance</option>
                    <option value="Business">Business</option>
                    <option value="Investments">Investments</option>
                    <option value="Rental">Rental</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddSource}
                  className="w-full py-2 rounded-xl bg-[#0297DE]/20 hover:bg-[#0297DE]/30 text-[#0297DE] border border-[#0297DE]/40 text-xs font-bold transition-colors"
                >
                  + Add Income Source
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Financial Goals */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-xs text-[#8397AB]">
                Select primary financial targets you want to focus on this year:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOAL_OPTIONS.map(goal => {
                  const isSelected = selectedGoals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleGoal(goal)}
                      className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? 'bg-[#FC734D]/15 border-[#FC734D] text-[#FCFFFF] shadow-sm'
                          : 'bg-[#050E17] border-[#143652] text-[#8397AB] hover:text-[#FCFFFF]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-[#FC734D] text-[#02070A]' : 'border border-[#143652]'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold leading-tight">{goal}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Feature Toggles & Dashboard Widgets */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h4 className="text-xs font-bold text-[#FCFFFF] uppercase tracking-wider mb-2">
                  Feature Controls (Enable / Disable Freely)
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#050E17] border border-[#143652] cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-[#FCFFFF]">Manual Bills Planner</p>
                      <p className="text-[11px] text-[#8397AB]">Manage obligations with manual control (no forced bank debits)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={toggles.billsTracker}
                      onChange={e => setToggles(prev => ({ ...prev, billsTracker: e.target.checked }))}
                      className="w-4 h-4 text-[#FC734D] rounded border-[#143652] bg-[#081622]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#050E17] border border-[#143652] cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-[#FCFFFF]">Confidential Privacy Mode</p>
                      <p className="text-[11px] text-[#8397AB]">Mask sensitive balances and amounts when in public</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={toggles.confidentialPrivacyMode}
                      onChange={e => setToggles(prev => ({ ...prev, confidentialPrivacyMode: e.target.checked }))}
                      className="w-4 h-4 text-[#FC734D] rounded border-[#143652] bg-[#081622]"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#FCFFFF] uppercase tracking-wider mb-2">
                  Dashboard Widgets Visibility
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(widgets).map(([wKey, isVisible]) => (
                    <label key={wKey} className="flex items-center gap-2 p-2 rounded-lg bg-[#050E17] border border-[#143652] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={e => setWidgets(prev => ({ ...prev, [wKey]: e.target.checked }))}
                        className="w-3.5 h-3.5 text-[#0297DE] rounded"
                      />
                      <span className="text-[#8397AB] font-medium capitalize">
                        {wKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-[#143652] flex items-center justify-between bg-[#050E17]/60">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 rounded-xl bg-[#081622] hover:bg-[#0D2235] border border-[#143652] text-xs font-bold text-[#FCFFFF] flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] text-[#02070A] text-xs font-black shadow-lg shadow-[#FC734D]/25 flex items-center gap-1.5 transition-all hover:scale-105"
              >
                Save & Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FC734D] via-[#F95C30] to-[#0297DE] text-[#02070A] text-xs font-black shadow-xl shadow-[#FC734D]/30 flex items-center gap-1.5 transition-all hover:scale-105"
              >
                Complete Setup & Open Vault
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
