import React, { useState, useRef, useEffect } from 'react';
import { 
  Account, 
  UserProfile, 
  FeatureToggles, 
  DashboardWidgetConfig 
} from '../types';
import { PRESET_AVATARS, resolveAvatarUrl } from '../utils/avatars';
import { 
  X, 
  User, 
  CreditCard, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  Check, 
  Wallet, 
  Smartphone, 
  Mail, 
  Download, 
  Upload, 
  Sparkles, 
  Moon, 
  Sun, 
  SlidersHorizontal,
  Target, 
  Camera, 
  LogOut,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Clock,
  Layers,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

interface Props {
  accounts: Account[];
  activeAccountId: string;
  userProfile: UserProfile;
  featureToggles: FeatureToggles;
  widgetConfig: DashboardWidgetConfig;
  theme: 'DARK' | 'LIGHT';
  setTheme: (t: 'DARK' | 'LIGHT') => void;
  onClose: () => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateFeatureToggles: (toggles: FeatureToggles) => void;
  onUpdateWidgetConfig: (config: DashboardWidgetConfig) => void;
  onDeleteAccount: (id: string) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetAllData?: () => void;
  onLogout?: () => void;
  onReopenOnboarding?: () => void;
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

const SettingsModal: React.FC<Props> = ({ 
  accounts, 
  activeAccountId,
  userProfile, 
  featureToggles = DEFAULT_TOGGLES,
  widgetConfig,
  theme,
  setTheme,
  onClose, 
  onUpdateAccounts, 
  onUpdateProfile,
  onUpdateFeatureToggles,
  onUpdateWidgetConfig,
  onDeleteAccount,
  onExportData,
  onImportData,
  onResetAllData,
  onLogout,
  onReopenOnboarding
}) => {
  const [activeTab, setActiveTab] = useState<'FEATURES' | 'PREFERENCES' | 'PROFILE' | 'ACCOUNTS' | 'DATA'>('FEATURES');
  const [toggles, setToggles] = useState<FeatureToggles>(featureToggles);
  const [widgets, setWidgets] = useState<DashboardWidgetConfig>(widgetConfig);
  const [currency, setCurrency] = useState(userProfile.currencyPreference || 'INR');
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');

  // Profile Form State
  const [tempName, setTempName] = useState(userProfile.name);
  const [tempEmail, setTempEmail] = useState(userProfile.email);
  const [tempPhone, setTempPhone] = useState(userProfile.phone);
  const [tempAvatarSeed, setTempAvatarSeed] = useState(userProfile.avatarSeed || userProfile.name);
  const [statusMessage, setStatusMessage] = useState('');
  const avatarUploadRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accounts State
  const [newAccountName, setNewAccountName] = useState('');

  const handleToggle = (key: keyof FeatureToggles) => {
    const updated = { ...toggles, [key]: !toggles[key] };
    setToggles(updated);
    onUpdateFeatureToggles(updated);
  };

  const handleWidgetToggle = (key: keyof DashboardWidgetConfig) => {
    const updated = { ...widgets, [key]: !widgets[key] };
    setWidgets(updated);
    onUpdateWidgetConfig(updated);
  };

  const handleSaveProfile = () => {
    onUpdateProfile({
      ...userProfile,
      name: tempName,
      email: tempEmail,
      phone: tempPhone,
      avatarSeed: tempAvatarSeed,
      currencyPreference: currency
    });
    setStatusMessage('Profile saved successfully!');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    
    const newAccount: Account = {
      id: `acc-${Date.now()}`,
      name: newAccountName.trim(),
      type: 'PERSONAL',
      color: 'amber',
      avatarSeed: Math.random().toString(36).substring(7),
      budgets: {}
    };
    
    onUpdateAccounts([...accounts, newAccount]);
    setNewAccountName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02070A]/85 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-[#081622] border border-[#143652] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-[#143652] flex justify-between items-center bg-[#050E17]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FC734D] to-[#0297DE] flex items-center justify-center text-[#02070A]">
              <SlidersHorizontal className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#FCFFFF]">Workspace Settings & Feature Controls</h2>
              <p className="text-xs text-[#8397AB]">Personalize features, privacy, currency, and multi-platform data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[#0D2235] text-[#8397AB] hover:text-[#FCFFFF]">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-[#143652] overflow-x-auto bg-[#050E17]/30">
          {[
            { id: 'FEATURES', label: 'Feature Toggles' },
            { id: 'PREFERENCES', label: 'Preferences & Widgets' },
            { id: 'PROFILE', label: 'Profile' },
            { id: 'ACCOUNTS', label: 'Accounts & Shared' },
            { id: 'DATA', label: 'Data Sovereignty & Backup' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === t.id
                  ? 'border-[#FC734D] text-[#FC734D]'
                  : 'border-transparent text-[#8397AB] hover:text-[#FCFFFF]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {statusMessage && (
            <div className="p-3 rounded-xl bg-[#22C58B]/15 border border-[#22C58B]/40 text-xs text-[#22C58B] flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* TAB 1: INDEPENDENT FEATURE TOGGLES (Requirement 7) */}
          {activeTab === 'FEATURES' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] text-xs text-[#8397AB]">
                Enable or disable features to suit your workflow. Inactive modules remain hidden without deleting your recorded data.
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: 'manualTrackingOnly' as keyof FeatureToggles,
                    title: '1. Manual Tracking Mode (Zero Forced Bank Sync)',
                    desc: 'Never requires connecting your bank account. Keep full control of every recorded cent.'
                  },
                  {
                    key: 'billsTracker' as keyof FeatureToggles,
                    title: '2. Bills & Payment Planner',
                    desc: 'Separate upcoming obligation reminder planner with manual payment marking (no direct debits).'
                  },
                  {
                    key: 'savingsGoals' as keyof FeatureToggles,
                    title: '3. Savings & Debt-Payoff Goals',
                    desc: 'Set target financial milestones and monitor progress towards debt freedom.'
                  },
                  {
                    key: 'spendingInsights' as keyof FeatureToggles,
                    title: '4. Spending Insights & Trend Charts',
                    desc: 'Automated cash flow velocity charts and rule-based spending heuristics.'
                  },
                  {
                    key: 'alertsAndNotifications' as keyof FeatureToggles,
                    title: '5. Alerts & Notifications',
                    desc: 'Receive alerts before bills are due and reminders when bills are overdue.'
                  },
                  {
                    key: 'sharedBudgets' as keyof FeatureToggles,
                    title: '6. Shared Ledgers with Partner / Family',
                    desc: 'Multi-account management allowing personal and shared family ledgers.'
                  },
                  {
                    key: 'simpleMode' as keyof FeatureToggles,
                    title: '7. Simple Mode vs Advanced Customization',
                    desc: 'Simplified view focused solely on quick logging and remaining cash balance.'
                  },
                  {
                    key: 'confidentialPrivacyMode' as keyof FeatureToggles,
                    title: '8. Privacy & Confidential Mode',
                    desc: 'Mask account balances and transactions with asterisks in public or shared spaces.'
                  }
                ].map(item => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#050E17] border border-[#143652] hover:border-[#FC734D]/40 transition-colors cursor-pointer"
                  >
                    <div className="pr-4">
                      <p className="text-xs font-bold text-[#FCFFFF]">{item.title}</p>
                      <p className="text-[11px] text-[#8397AB] mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={toggles[item.key]}
                      onChange={() => handleToggle(item.key)}
                      className="w-4 h-4 text-[#FC734D] rounded border-[#143652] bg-[#081622] shrink-0"
                    />
                  </label>
                ))}
              </div>

              {onReopenOnboarding && (
                <div className="pt-2">
                  <button
                    onClick={onReopenOnboarding}
                    className="text-xs font-bold text-[#0297DE] hover:underline"
                  >
                    Revisit Step-by-Step Profile Onboarding Wizard →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PREFERENCES & WIDGET VISIBILITY */}
          {activeTab === 'PREFERENCES' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1.5">
                    Currency Preference
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
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
                    Date Format
                  </label>
                  <select
                    value={dateFormat}
                    onChange={e => setDateFormat(e.target.value as any)}
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1.5">
                    Color Theme
                  </label>
                  <select
                    value={theme}
                    onChange={e => setTheme(e.target.value as any)}
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  >
                    <option value="DARK">Midnight Black & Electric Blue (Default)</option>
                    <option value="LIGHT">Clean Light Theme</option>
                  </select>
                </div>
              </div>

              {/* Dashboard Widgets Config */}
              <div className="pt-3 border-t border-[#143652] space-y-3">
                <h4 className="text-xs font-bold text-[#FCFFFF] uppercase tracking-wider">
                  Dashboard Widget Visibility
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(widgets).map(([wKey, isVisible]) => (
                    <label key={wKey} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#050E17] border border-[#143652] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => handleWidgetToggle(wKey as keyof DashboardWidgetConfig)}
                        className="w-4 h-4 text-[#0297DE] rounded"
                      />
                      <span className="text-[#8397AB] font-medium capitalize">
                        {wKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-xs font-black text-[#02070A]"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PROFILE */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Full Name / Alias
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={tempEmail}
                    onChange={e => setTempEmail(e.target.value)}
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={tempPhone}
                    onChange={e => setTempPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-xs font-black text-[#02070A]"
                >
                  Update Profile
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ACCOUNTS & SHARED */}
          {activeTab === 'ACCOUNTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#FCFFFF] uppercase tracking-wider">Managed Accounts</h4>
                  <p className="text-[11px] text-[#8397AB]">Keep personal finances separate from shared partner accounts</p>
                </div>
              </div>

              <div className="space-y-2">
                {accounts.map(acc => (
                  <div key={acc.id} className="p-3 rounded-2xl bg-[#050E17] border border-[#143652] flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-[#FCFFFF]">{acc.name}</span>
                      <span className="ml-2 px-2 py-0.2 rounded bg-[#143652] text-[10px] text-[#0297DE]">{acc.type}</span>
                    </div>
                    {accounts.length > 1 && (
                      <button
                        onClick={() => onDeleteAccount(acc.id)}
                        className="text-[#8397AB] hover:text-[#FC734D] p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddAccount} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  placeholder="New account name (e.g. Family Vault, Side Hustle)"
                  className="flex-1 bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0297DE] text-xs font-bold text-[#02070A]"
                >
                  Add Account
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: DATA SOVEREIGNTY, EXPORT & RESTORE (Requirement 8) */}
          {activeTab === 'DATA' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] space-y-2">
                <h4 className="text-xs font-extrabold text-[#FCFFFF] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#22C58B]" />
                  100% Data Sovereignty & Offline Portability
                </h4>
                <p className="text-[11px] text-[#8397AB] leading-relaxed">
                  Your financial records are never locked in. Export comprehensive spreadsheets or raw JSON backups, and restore them anytime.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={onExportData}
                  className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] hover:border-[#0297DE] text-left transition-colors flex items-center gap-3"
                >
                  <Download className="w-5 h-5 text-[#0297DE]" />
                  <div>
                    <span className="text-xs font-bold text-[#FCFFFF] block">Export JSON Full Backup</span>
                    <span className="text-[10px] text-[#8397AB]">Complete profile, ledgers, envelopes, bills</span>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-[#050E17] border border-[#143652] hover:border-[#FC734D] text-left transition-colors flex items-center gap-3"
                >
                  <Upload className="w-5 h-5 text-[#FC734D]" />
                  <div>
                    <span className="text-xs font-bold text-[#FCFFFF] block">Restore from JSON Backup</span>
                    <span className="text-[10px] text-[#8397AB]">Re-hydrate offline records safely</span>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) onImportData(f);
                  }}
                  className="hidden"
                />
              </div>

              {/* Danger Zone: Reset Data */}
              {onResetAllData && (
                <div className="p-4 rounded-2xl bg-[#FC734D]/10 border border-[#FC734D]/30 space-y-2">
                  <span className="text-xs font-bold text-[#FC734D] block">Danger Zone: Data Deletion</span>
                  <p className="text-[11px] text-[#8397AB]">
                    Wipe local ledger cache and reset application state.
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to reset all stored financial data? This cannot be undone unless you have an exported JSON backup.')) {
                        onResetAllData();
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FC734D]/20 hover:bg-[#FC734D]/30 text-[#FC734D] text-xs font-bold border border-[#FC734D]/40 transition-colors"
                  >
                    Delete Local Ledger Data
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#143652] flex justify-between items-center bg-[#050E17]/60">
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-xs font-bold text-[#FC734D] hover:underline flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out of Session
            </button>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#081622] hover:bg-[#0D2235] border border-[#143652] text-xs font-bold text-[#FCFFFF] ml-auto"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
