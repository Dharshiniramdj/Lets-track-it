import React, { useState, useEffect } from 'react';
import { AuthService, AuthUser } from '../services/authService';
import { Lock, Mail, User, ShieldCheck, Eye, EyeOff, ArrowRight, CheckCircle2, XCircle, AlertCircle, RefreshCw, KeyRound, ArrowLeft, AtSign, TrendingUp, Sparkles } from 'lucide-react';

interface Props {
  onAuthSuccess: (user: AuthUser) => void;
  initialMode?: 'LOGIN' | 'SIGNUP';
  onBackToLanding?: () => void;
}

export const AuthView: React.FC<Props> = ({ onAuthSuccess, initialMode = 'LOGIN', onBackToLanding }) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT' | 'RESET_PASSWORD'>(initialMode);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Email or Username
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Sign up fields
  const [signupUsername, setSignupUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [currency, setCurrency] = useState('INR');

  // Forgot Password fields
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password validation breakdown
  const passwordCheck = AuthService.validatePassword(mode === 'RESET_PASSWORD' ? newPassword : signupPassword);
  const usernameCheck = AuthService.validateUsername(signupUsername);
  const passwordsMatch = mode === 'RESET_PASSWORD'
    ? (newPassword && confirmNewPassword && newPassword === confirmNewPassword)
    : (signupPassword && signupConfirmPassword && signupPassword === signupConfirmPassword);

  // Check URL on mount for password reset callback
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('reset-password')) {
      setMode('RESET_PASSWORD');
    }

    const unsubscribe = AuthService.initAuthListener(
      undefined,
      () => setMode('RESET_PASSWORD')
    );
    return () => unsubscribe();
  }, []);

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    setErrorMessage('');
    if (!loginIdentifier || !loginPassword) {
      setErrorMessage('Please enter your email or username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthService.login(loginIdentifier, loginPassword);
      setSuccessMessage('Signed in successfully! Welcome back.');
      setTimeout(() => onAuthSuccess(res.user), 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    setErrorMessage('');

    if (!signupUsername.trim()) {
      setErrorMessage('Please choose a username.');
      return;
    }
    if (!usernameCheck.isValid) {
      setErrorMessage(usernameCheck.error || 'Username must be 3-30 characters with letters, numbers, and underscores only.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }
    if (!passwordCheck.isValid) {
      setErrorMessage('Password must be at least 8 characters long and include numbers or symbols.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthService.signup(
        signupUsername,
        signupEmail,
        signupPassword,
        fullName || signupUsername,
        currency
      );
      setSuccessMessage(res.message);
      setTimeout(() => onAuthSuccess(res.user), 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !forgotIdentifier) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await AuthService.forgotPassword(forgotIdentifier);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch password reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage('');
    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (!passwordCheck.isValid) {
      setErrorMessage('New password must be at least 8 characters long and include numbers or symbols.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthService.resetPassword(newPassword);
      setSuccessMessage(res.message);
      setTimeout(() => {
        setMode('LOGIN');
        setNewPassword('');
        setConfirmNewPassword('');
        window.location.hash = '';
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (demoIdentifier: string) => {
    setLoginIdentifier(demoIdentifier);
    setLoginPassword('DemoPassword123!');
  };

  return (
    <div className="min-h-screen bg-[#02070A] text-[#FCFFFF] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient glowing orbs */}
      <div className="bg-glow-orb top-1/4 -left-48 w-96 h-96 bg-[#0297DE]" />
      <div className="bg-glow-orb bottom-1/4 -right-48 w-96 h-96 bg-[#FC734D]" />

      {/* Optional Back to Landing button */}
      {onBackToLanding && (
        <button
          type="button"
          onClick={onBackToLanding}
          className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-[#8397AB] hover:text-[#FCFFFF] px-4 py-2 rounded-xl bg-[#081622]/80 border border-[#143652] transition-all hover:scale-105 relative z-10"
        >
          <ArrowLeft className="w-4 h-4 text-[#FC734D]" />
          <span>Back to Welcome Landing</span>
        </button>
      )}

      {/* Main Container Card with Glassmorphism */}
      <div className="w-full max-w-md bg-[#081622]/90 backdrop-blur-2xl border border-[#143652] rounded-3xl p-7 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] relative z-10">
        
        {/* Screen 1 – Welcome / Onboarding Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FC734D] to-[#0297DE] text-[#02070A] shadow-[0_0_25px_rgba(252,115,77,0.35)] mb-3.5">
            <TrendingUp className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#FCFFFF]">Take Control of Your Money.</h1>
          <p className="text-xs text-[#8397AB] mt-1.5 font-medium leading-relaxed max-w-xs mx-auto">
            Confidential tracking, envelope budgets, and zero forced bank debits.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0297DE]/10 border border-[#0297DE]/25 text-[11px] font-bold text-[#0297DE]">
            <span className="w-2 h-2 rounded-full bg-[#0297DE] animate-pulse"></span>
            <span>Supabase Auth & RLS Protected</span>
          </div>
        </div>

        {/* Tab Switcher (Sign In vs Get Started) */}
        {mode !== 'FORGOT' && mode !== 'RESET_PASSWORD' && (
          <div className="flex bg-[#050E17] p-1 rounded-2xl mb-6 border border-[#143652]">
            <button
              type="button"
              onClick={() => { setMode('LOGIN'); setErrorMessage(''); setSuccessMessage(''); }}
              data-testid="auth-tab-login"
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'LOGIN'
                  ? 'bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-[#02070A] shadow-[0_0_12px_rgba(252,115,77,0.35)]'
                  : 'text-[#8397AB] hover:text-[#FCFFFF]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('SIGNUP'); setErrorMessage(''); setSuccessMessage(''); }}
              data-testid="auth-tab-signup"
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'SIGNUP'
                  ? 'bg-gradient-to-r from-[#FC734D] to-[#F95C30] text-[#02070A] shadow-[0_0_12px_rgba(252,115,77,0.35)]'
                  : 'text-[#8397AB] hover:text-[#FCFFFF]'
              }`}
            >
              Get Started
            </button>
          </div>
        )}

        {/* Error / Success Feedback Alerts */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-[#FC734D]/15 border border-[#FC734D]/40 rounded-xl flex items-start gap-2.5 text-xs text-[#FC734D]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FC734D]" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 bg-[#22C58B]/15 border border-[#22C58B]/40 rounded-xl flex items-start gap-2.5 text-xs text-[#22C58B]">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#22C58B]" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* ========================================================
            MODE 1: SIGN IN (EMAIL OR USERNAME + PASSWORD)
           ======================================================== */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-identifier" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8397AB] mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-[#8397AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-identifier"
                  type="text"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  placeholder="Username or email address"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  data-testid="auth-login-email-input"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#FCFFFF] placeholder-[#5A688A] focus:outline-none focus:border-[#FC734D] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="login-password" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8397AB]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('FORGOT'); setErrorMessage(''); setSuccessMessage(''); setForgotIdentifier(loginIdentifier); }}
                  className="text-[11px] text-[#0297DE] hover:text-[#FC734D] font-semibold"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8397AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  data-testid="auth-login-password-input"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#FCFFFF] placeholder-[#5A688A] focus:outline-none focus:border-[#FC734D] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8397AB] hover:text-[#FCFFFF]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8397AB]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-[#143652] bg-[#050E17] text-[#FC734D] focus:ring-0"
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              data-testid="auth-login-btn"
              className="w-full py-3.5 bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] active:scale-[0.99] transition-all text-[#02070A] font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(252,115,77,0.3)] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#02070A]" />
              ) : (
                <>
                  <span>Sign In to Vault</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Quick Demo Login Pills */}
            <div className="pt-4 border-t border-[#143652]">
              <p className="text-[10px] text-[#8397AB] uppercase font-bold tracking-wider text-center mb-2.5">
                Quick Demo Access
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('alex@letstrackit.app')}
                  className="py-1.5 px-2 bg-[#050E17] hover:bg-[#0D2235] text-[#8397AB] hover:text-[#FC734D] rounded-xl text-[11px] font-semibold border border-[#143652] transition-colors"
                >
                  Alex Vance (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('cyra@letstrackit.app')}
                  className="py-1.5 px-2 bg-[#050E17] hover:bg-[#0D2235] text-[#8397AB] hover:text-[#FC734D] rounded-xl text-[11px] font-semibold border border-[#143652] transition-colors"
                >
                  Cyra eilleen (User)
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================
            MODE 2: REGISTRATION (USERNAME, EMAIL, PASSWORD, CONFIRM)
           ======================================================== */}
        {mode === 'SIGNUP' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="signup-username" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8E9BB5]">
                  Username
                </label>
                {signupUsername && (
                  <span className={`text-[10px] font-bold ${usernameCheck.isValid ? 'text-[#22C58B]' : 'text-[#FC734D]'}`}>
                    {usernameCheck.isValid ? 'Valid username' : 'Letters, numbers, underscores'}
                  </span>
                )}
              </div>
              <div className="relative">
                <AtSign className="w-4 h-4 text-[#8397AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-username"
                  type="text"
                  value={signupUsername}
                  onChange={e => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. alex_fintech"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  data-testid="auth-username-input"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#FCFFFF] placeholder-[#5A688A] focus:outline-none focus:border-[#FC734D] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-name" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8397AB] mb-1.5">
                Full Name (Optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8397AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-name"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Alex Vance"
                  data-testid="auth-fullname-input"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#FCFFFF] placeholder-[#5A688A] focus:outline-none focus:border-[#FC734D] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8397AB] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8397AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  placeholder="alex@letstrackit.app"
                  required
                  autoCapitalize="none"
                  data-testid="auth-email-input"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#FCFFFF] placeholder-[#5A688A] focus:outline-none focus:border-[#FC734D] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-currency" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8397AB] mb-1.5">
                Currency Preference
              </label>
              <select
                id="signup-currency"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2.5 text-sm text-[#FCFFFF] focus:outline-none focus:border-[#FC734D] transition-colors cursor-pointer"
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
              <label htmlFor="signup-password" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8E9BB5] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8E9BB5] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  placeholder="Min 8 characters with numbers or symbols"
                  required
                  data-testid="auth-password-input"
                  className="w-full bg-[#101738] border border-[#26336B] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#FCFFFF] placeholder-[#5A688A] focus:outline-none focus:border-[#74FFED] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E9BB5] hover:text-[#FCFFFF]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Checklist */}
              {signupPassword.length > 0 && (
                <div className="mt-2.5 p-3 bg-[#101738] rounded-xl border border-[#26336B] space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-[#8E9BB5]">STRENGTH</span>
                    <span className={passwordCheck.score >= 3 ? 'text-[#22C58B]' : 'text-[#FC734D]'}>
                      {passwordCheck.feedback}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-[#26336B] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordCheck.score === 1
                          ? 'w-1/4 bg-[#FC734D]'
                          : passwordCheck.score === 2
                          ? 'w-2/4 bg-[#FBBF24]'
                          : passwordCheck.score === 3
                          ? 'w-3/4 bg-[#22C58B]'
                          : 'w-full bg-[#22C58B]'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] text-[#8E9BB5] pt-1">
                    <div className="flex items-center gap-1.5">
                      {passwordCheck.hasLength ? <CheckCircle2 className="w-3 h-3 text-[#22C58B]" /> : <XCircle className="w-3 h-3 text-[#5A688A]" />}
                      <span>Min 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordCheck.hasUpper || passwordCheck.hasLower ? <CheckCircle2 className="w-3 h-3 text-[#22C58B]" /> : <XCircle className="w-3 h-3 text-[#5A688A]" />}
                      <span>Letters (A-Z)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordCheck.hasNumber ? <CheckCircle2 className="w-3 h-3 text-[#22C58B]" /> : <XCircle className="w-3 h-3 text-[#5A688A]" />}
                      <span>Number (0-9)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordCheck.hasSymbol ? <CheckCircle2 className="w-3 h-3 text-[#22C58B]" /> : <XCircle className="w-3 h-3 text-[#5A688A]" />}
                      <span>Symbol (@#$)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Password Confirmation */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="signup-confirm-password" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8E9BB5]">
                  Confirm Password
                </label>
                {signupConfirmPassword && (
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${passwordsMatch ? 'text-[#22C58B]' : 'text-[#FC734D]'}`}>
                    {passwordsMatch ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {passwordsMatch ? 'Passwords match' : 'Must match'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8E9BB5] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={signupConfirmPassword}
                  onChange={e => setSignupConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  data-testid="auth-confirm-password-input"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#FCFFFF] placeholder-[#5A688A] focus:outline-none focus:border-[#FC734D] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle confirm password visibility"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8397AB] hover:text-[#FCFFFF]"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !passwordCheck.isValid || !passwordsMatch || !usernameCheck.isValid}
              data-testid="auth-signup-btn"
              className="w-full py-3.5 bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] active:scale-[0.99] transition-all text-[#02070A] font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(252,115,77,0.3)] cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#02070A]" />
              ) : (
                <>
                  <span>Create Account & Sign In</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================
            MODE 3: FORGOT PASSWORD (EMAIL RESET LINK)
           ======================================================== */}
        {mode === 'FORGOT' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setErrorMessage(''); setSuccessMessage(''); }}
                className="p-1 hover:bg-[#0D2235] rounded-lg text-[#8397AB] hover:text-[#FCFFFF] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-[#FCFFFF]">Reset Password</h2>
            </div>

            <form onSubmit={handleForgotRequest} className="space-y-4">
              <p className="text-xs text-[#8397AB] leading-relaxed">
                Enter your registered email address or username. We'll send you a secure password reset link to your email.
              </p>
              <div>
                <label htmlFor="forgot-identifier" className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8397AB] mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-[#8397AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-identifier"
                    type="text"
                    value={forgotIdentifier}
                    onChange={e => setForgotIdentifier(e.target.value)}
                    placeholder="name@letstrackit.app or username"
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#FCFFFF] placeholder-[#5A688A] focus:outline-none focus:border-[#FC734D]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !forgotIdentifier}
                className="w-full py-3 bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] text-[#02070A] font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(252,115,77,0.3)] cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#02070A]" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('LOGIN'); setErrorMessage(''); setSuccessMessage(''); }}
                  className="text-xs text-[#0297DE] hover:text-[#FC734D] font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            MODE 4: SET NEW PASSWORD (AFTER CLICKING RESET LINK)
           ======================================================== */}
        {mode === 'RESET_PASSWORD' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-[#0297DE]/15 text-[#0297DE]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#FCFFFF]">Choose New Password</h2>
                <p className="text-[11px] text-[#8397AB]">Enter a strong new password for your account</p>
              </div>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8397AB] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8397AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8397AB] hover:text-[#FCFFFF]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8397AB]">
                    Confirm New Password
                  </label>
                  {confirmNewPassword && (
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${passwordsMatch ? 'text-[#0297DE]' : 'text-[#FC734D]'}`}>
                      {passwordsMatch ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {passwordsMatch ? 'Passwords match' : 'Must match'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8397AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#FCFFFF] focus:outline-none focus:border-[#FC734D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8397AB] hover:text-[#FCFFFF]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !newPassword || !passwordsMatch || !passwordCheck.isValid}
                className="w-full py-3 bg-gradient-to-r from-[#FC734D] to-[#F95C30] hover:from-[#F95C30] hover:to-[#FC734D] text-[#02070A] font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(252,115,77,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#02070A]" />
                ) : (
                  'Update Password & Sign In'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
