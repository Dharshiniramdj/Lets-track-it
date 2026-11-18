import React from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Wallet, 
  Calendar, 
  Lock, 
  Download, 
  ArrowRight, 
  Layers, 
  Package, 
  Split, 
  PieChart as PieIcon, 
  Clock, 
  CheckCircle2, 
  FileSpreadsheet, 
  Printer, 
  Sparkles,
  ChevronRight,
  EyeOff
} from 'lucide-react';

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
  onExploreDemo?: () => void;
}

export const WelcomeLanding: React.FC<Props> = ({ onGetStarted, onSignIn, onExploreDemo }) => {
  return (
    <div className="min-h-screen bg-[#02070A] text-[#FCFFFF] selection:bg-[#FC734D] selection:text-[#02070A] overflow-x-hidden">
      {/* Dynamic Background Glow Orbs */}
      <div 
        className="bg-glow-orb bg-[#0297DE] top-[-10%] left-[-10%] w-[500px] h-[500px]"
        style={{ animation: 'floatGlow 18s ease-in-out infinite alternate' }}
      />
      <div 
        className="bg-glow-orb bg-[#FC734D] bottom-[-10%] right-[-10%] w-[600px] h-[600px]"
        style={{ animation: 'floatGlow 22s ease-in-out infinite alternate-reverse' }}
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 glass-header px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FC734D] to-[#0297DE] p-[2px] shadow-lg shadow-[#FC734D]/20">
              <div className="w-full h-full bg-[#02070A] rounded-[14px] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#FC734D]" />
              </div>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-[#FC734D] via-[#FCFFFF] to-[#0297DE] bg-clip-text text-transparent">
                Let's Track It
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#0297DE]/15 text-[#0297DE] border border-[#0297DE]/30">
                Confidential & Pro
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="px-4 py-2 text-sm font-semibold text-[#8397AB] hover:text-[#FCFFFF] transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] text-[#02070A] shadow-lg shadow-[#FC734D]/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#081622] border border-[#143652] text-xs font-semibold text-[#0297DE] shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[#0297DE]" />
            <span>Zero Forced Bank Debits • Complete Data Sovereignty • Offline First</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.15]">
            Master Your Money. <br />
            <span className="bg-gradient-to-r from-[#FC734D] via-[#FCFFFF] to-[#0297DE] bg-clip-text text-transparent">
              Own Every Single Cent.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#8397AB] leading-relaxed">
            Let's Track It is the privacy-focused, customizable personal finance operating system built for people who want absolute control over their cash flow, multiple income streams, manual bills, and future wealth without surrendering bank credentials.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-[#02070A] font-extrabold text-base shadow-xl shadow-[#FC734D]/30 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              Start Tracking Now — It's Free
              <ArrowRight className="w-5 h-5" />
            </button>
            {onExploreDemo && (
              <button
                onClick={onExploreDemo}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#081622] hover:bg-[#0D2235] border border-[#143652] text-[#FCFFFF] font-bold text-base transition-all flex items-center justify-center gap-2"
              >
                Explore Interactive Demo
                <ChevronRight className="w-5 h-5 text-[#0297DE]" />
              </button>
            )}
          </div>

          {/* Quick Metrics Banner */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="glass-card p-4 rounded-2xl border border-[#143652]">
              <div className="text-xs text-[#8397AB] font-medium">Data Privacy</div>
              <div className="text-xl font-black text-[#FCFFFF] mt-1">100% Private</div>
              <div className="text-[11px] text-[#0297DE] mt-0.5">Encrypted & Self-Owned</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-[#143652]">
              <div className="text-xs text-[#8397AB] font-medium">Income Sources</div>
              <div className="text-xl font-black text-[#0297DE] mt-1">Multi-Stream</div>
              <div className="text-[11px] text-[#8397AB] mt-0.5">Salary, freelance, gigs</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-[#143652]">
              <div className="text-xs text-[#8397AB] font-medium">Bills Control</div>
              <div className="text-xl font-black text-[#FC734D] mt-1">Manual Approval</div>
              <div className="text-[11px] text-[#8397AB] mt-0.5">Zero forced bank debits</div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-[#143652]">
              <div className="text-xs text-[#8397AB] font-medium">Offline Engine</div>
              <div className="text-xl font-black text-[#FCFFFF] mt-1">Instant Sync</div>
              <div className="text-[11px] text-[#0297DE] mt-0.5">Works without network</div>
            </div>
          </div>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-14 max-w-5xl mx-auto rounded-3xl p-1 bg-gradient-to-b from-[#0297DE]/40 via-[#FC734D]/20 to-transparent shadow-2xl shadow-[#0297DE]/10">
          <div className="glass-card rounded-[22px] p-6 sm:p-8 overflow-hidden bg-[#081622]/95 border border-[#143652]">
            {/* Window Bar */}
            <div className="flex items-center justify-between pb-6 border-b border-[#143652]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FC734D]/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-[#0297DE]/80" />
                <span className="ml-3 text-xs font-mono text-[#8397AB]">letstrackit.app / dashboard</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#0297DE]/15 text-[#0297DE] border border-[#0297DE]/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0297DE] animate-pulse" />
                  Live Confidential Preview
                </span>
              </div>
            </div>

            {/* Mock Dashboard Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              {/* Total Balance Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0D2235] to-[#081622] border border-[#143652] relative overflow-hidden">
                <div className="flex justify-between items-center text-xs text-[#8397AB] font-semibold">
                  <span>NET LIQUID BALANCE</span>
                  <Wallet className="w-4 h-4 text-[#0297DE]" />
                </div>
                <div className="text-3xl font-black text-[#FCFFFF] mt-2">₹1,84,350</div>
                <div className="text-xs text-[#0297DE] font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +18.4% monthly surplus
                </div>
              </div>

              {/* Monthly Income Card */}
              <div className="p-5 rounded-2xl bg-[#081622] border border-[#143652]">
                <div className="flex justify-between items-center text-xs text-[#8397AB] font-semibold">
                  <span>MONTHLY INFLOW (3 SOURCES)</span>
                  <span className="text-[#0297DE] font-bold">Active</span>
                </div>
                <div className="text-3xl font-black text-[#0297DE] mt-2">₹95,000</div>
                <div className="text-xs text-[#8397AB] mt-1">Tech Salary (₹75k) + Freelance (₹20k)</div>
              </div>

              {/* Net Cash Flow Card */}
              <div className="p-5 rounded-2xl bg-[#081622] border border-[#143652]">
                <div className="flex justify-between items-center text-xs text-[#8397AB] font-semibold">
                  <span>NET MONTHLY SAVINGS</span>
                  <span className="text-[#22C58B] font-bold">+₹47,200</span>
                </div>
                <div className="text-3xl font-black text-[#22C58B] mt-2">+49.6%</div>
                <div className="text-xs text-[#8397AB] mt-1">Inflows cleanly exceed monthly obligations</div>
              </div>
            </div>

            {/* Upcoming Bills vs Deliveries Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <div className="p-5 rounded-2xl bg-[#050E17] border border-[#143652]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#FCFFFF] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Upcoming Bills to Pay (Manual)
                  </h4>
                  <span className="text-xs text-amber-400 font-semibold">2 Due This Week</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#081622] flex justify-between items-center border border-[#143652]">
                    <div>
                      <p className="font-semibold text-[#FCFFFF]">Fiber Internet Bill</p>
                      <p className="text-[10px] text-[#8397AB]">Due in 2 days • Auto reminders active</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#FC734D]">₹1,179</p>
                      <span className="text-[10px] text-amber-400">Pending</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#050E17] border border-[#143652]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#FCFFFF] flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0297DE]" />
                    Upcoming Deliveries Box (Separated)
                  </h4>
                  <span className="text-xs text-[#0297DE] font-semibold">1 On The Way</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#081622] flex justify-between items-center border border-[#143652] text-xs">
                  <div>
                    <p className="font-semibold text-[#FCFFFF]">Mechanical Keyboard Upgrade</p>
                    <p className="text-[10px] text-[#8397AB]">Amazon Ref #402-98 • Est. Tomorrow</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#0297DE]">₹4,499</p>
                    <span className="text-[10px] text-[#0297DE]">Shipped</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Personal Financial Tracking Matters */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-t border-[#143652]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#FC734D]">The Philosophy</h2>
          <p className="text-3xl sm:text-4xl font-black mt-2">Why Intentional Tracking Wins</p>
          <p className="text-sm text-[#8397AB] mt-3">
            Automatic bank-scraping apps lull users into passive blindness. When you log and allocate intentionally, you eliminate hidden leakages, protect your banking privacy, and build real wealth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl border border-[#143652] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FC734D]/15 flex items-center justify-center text-[#FC734D]">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#FCFFFF]">No Bank Credentials Required</h3>
            <p className="text-xs text-[#8397AB] leading-relaxed">
              Never share your netbanking password, OTP, or SMS feed with third-party aggregators. Keep full sovereignty over your credentials.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-[#143652] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0297DE]/15 flex items-center justify-center text-[#0297DE]">
              <Split className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#FCFFFF]">Sentence Notes & Detailed Metadata</h3>
            <p className="text-xs text-[#8397AB] leading-relaxed">
              Add personal sentence notes to any transaction, tag records, attach receipts, and split receipts across multiple spending categories.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-[#143652] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/15 flex items-center justify-center text-amber-400">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#FCFFFF]">Zero Vendor Lock-In</h3>
            <p className="text-xs text-[#8397AB] leading-relaxed">
              One-click export to Excel (.xlsx), CSV, or clean JSON backup anytime. Print ink-friendly, A4 statements with zero toner waste.
            </p>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-t border-[#143652]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#0297DE]">Engineered For Precision</h2>
          <p className="text-3xl sm:text-4xl font-black mt-2">Comprehensive Financial Suite</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-[#081622] border border-[#143652] space-y-3 hover:border-[#FC734D]/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#FC734D]/15 flex items-center justify-center text-[#FC734D]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-[#FCFFFF]">Multiple Income Sources</h4>
            <p className="text-xs text-[#8397AB]">
              Track salary, side consulting, freelance jobs, dividends, and rental revenue in the same month with granular breakdowns.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#081622] border border-[#143652] space-y-3 hover:border-[#0297DE]/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#0297DE]/15 flex items-center justify-center text-[#0297DE]">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-[#FCFFFF]">Financial Calendar</h4>
            <p className="text-xs text-[#8397AB]">
              Visual monthly, weekly, and daily timeline showing exactly when income lands and when bills fall due.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#081622] border border-[#143652] space-y-3 hover:border-amber-400/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-[#FCFFFF]">Manual Bills Planner</h4>
            <p className="text-xs text-[#8397AB]">
              Maintain full autonomy over when you pay. Set due dates, recurrence frequencies, and reminder alerts without bank debits.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#081622] border border-[#143652] space-y-3 hover:border-[#0297DE]/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#0297DE]/15 flex items-center justify-center text-[#0297DE]">
              <Package className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-[#FCFFFF]">Upcoming Deliveries Box</h4>
            <p className="text-xs text-[#8397AB]">
              Keep delivery orders strictly separated from financial bills. Track carriers, estimated delivery dates, and package status.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#081622] border border-[#143652] space-y-3 hover:border-[#FC734D]/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#FC734D]/15 flex items-center justify-center text-[#FC734D]">
              <Split className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[#FCFFFF]">Receipt Vault & Category Splits</h4>
            <p className="text-xs text-[#8397AB]">
              Store receipt scans and invoices with multi-category splitting so a single store receipt accurately feeds separate financial categories.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#081622] border border-[#143652] space-y-3 hover:border-[#0297DE]/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#0297DE]/15 flex items-center justify-center text-[#0297DE]">
              <Printer className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-[#FCFFFF]">Ink-Friendly Statements & Excel</h4>
            <p className="text-xs text-[#8397AB]">
              Generate clean, high-contrast black-and-white printable statements or export structured .xlsx workbooks instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Footer Banner */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center">
        <div className="glass-card p-10 sm:p-14 rounded-3xl border border-[#143652] relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <h3 className="text-3xl sm:text-5xl font-black text-[#FCFFFF]">
              Take Full Command of Your Finances Today.
            </h3>
            <p className="text-sm sm:text-base text-[#8397AB] max-w-xl mx-auto">
              No hidden fees, no required bank syncing, and 100% offline capability. Experience personal finance management the way it should be.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-[#02070A] font-extrabold text-base shadow-xl shadow-[#FC734D]/30 hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                Create Your Free Account
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onSignIn}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#0D2235] hover:bg-[#143652] border border-[#143652] text-[#FCFFFF] font-bold text-base transition-all"
              >
                Existing User? Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#143652] text-center text-xs text-[#8397AB]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#FC734D]" />
            <span className="font-bold text-[#FCFFFF]">Let's Track It</span>
            <span>• Midnight Black + Electric Blue + Cantaloupe Orange</span>
          </div>
          <div>
            Built with extreme privacy, offline support, and user data ownership.
          </div>
        </div>
      </footer>
    </div>
  );
};
