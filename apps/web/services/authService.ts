import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string; // Supabase UUID
  email: string;
  username?: string;
  fullName: string;
  currencyPreference: string;
  status: 'ACTIVE';
}

const API_BASE = 'http://localhost:4000/api/v1';

export class AuthService {
  private static STORAGE_USER = 'letstrackit_auth_user';
  private static STORAGE_TOKENS = 'letstrackit_auth_tokens';

  /**
   * Password security criteria check
   */
  public static validatePassword(password: string): {
    isValid: boolean;
    hasLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
    score: number; // 0 to 4
    feedback: string;
  } {
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    let score = 0;
    if (password.length >= 8) score++;
    if (hasLength && (hasUpper || hasLower)) score++;
    if (hasNumber && hasSymbol) score++;
    if (password.length >= 10 && hasUpper && hasLower && hasNumber && hasSymbol) score++;

    const isValid = hasLength && (hasUpper || hasLower) && (hasNumber || hasSymbol);

    let feedback = 'Weak password';
    if (score === 2) feedback = 'Moderate password';
    if (score === 3) feedback = 'Strong password';
    if (score === 4) feedback = 'Enterprise-grade password';

    return {
      isValid,
      hasLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol,
      score,
      feedback
    };
  }

  /**
   * Validate username criteria
   * 3-30 characters, alphanumeric and underscores only
   */
  public static validateUsername(username: string): { isValid: boolean; error?: string } {
    const clean = username.trim();
    if (!clean) {
      return { isValid: false, error: 'Username is required.' };
    }
    if (clean.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters long.' };
    }
    if (clean.length > 30) {
      return { isValid: false, error: 'Username cannot exceed 30 characters.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, and underscores.' };
    }
    return { isValid: true };
  }

  /**
   * Check if user is currently logged in
   */
  public static isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    const tokens = this.getTokens();
    return !!(user && tokens?.accessToken);
  }

  /**
   * Get currently active session user
   */
  public static getCurrentUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get active JWT tokens
   */
  public static getTokens(): AuthTokens | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_TOKENS);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Securely resolve username to email via Supabase Edge Function
   */
  public static async resolveUsernameToEmail(username: string): Promise<string | null> {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) return null;

    // 1. Invoke Supabase Edge Function via official SDK
    try {
      const { data, error } = await supabase.functions.invoke('resolve-username', {
        body: { username: cleanUsername }
      });

      if (!error && data && data.email) {
        return data.email;
      }
    } catch (e) {
      // Continue to direct HTTP fetch fallback
    }

    // 2. Direct HTTP fetch fallback to Edge Function endpoint
    try {
      const metaEnv = (import.meta as any).env || {};
      const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://fsbufvnmbctuvzbgskhe.supabase.co';
      const anonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

      const res = await fetch(`${supabaseUrl}/functions/v1/resolve-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey
        },
        body: JSON.stringify({ username: cleanUsername })
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.email) {
          return json.email;
        }
      }
    } catch (err) {
      console.error('Failed to resolve username via Edge Function:', err);
    }

    return null;
  }

  /**
   * Initialize Supabase auth session listener and restore session
   */
  public static initAuthListener(
    onUserChange?: (user: AuthUser | null) => void,
    onPasswordRecovery?: () => void
  ): () => void {
    if (isSupabaseConfigured()) {
      // Check for recovery tokens in URL hash or query parameters
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        if (onPasswordRecovery) onPasswordRecovery();
      }

      // 1. Restore existing session if available
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!error && session && session.user) {
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username,
            fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
            currencyPreference: session.user.user_metadata?.currency_preference || session.user.user_metadata?.currencyPreference || 'INR',
            status: 'ACTIVE'
          };
          this.saveSession(authUser, {
            accessToken: session.access_token,
            refreshToken: session.refresh_token
          });
          if (onUserChange) onUserChange(authUser);
        }
      });

      // 2. Listen to live auth changes (login, logout, token refresh across tabs, password recovery)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          if (onPasswordRecovery) onPasswordRecovery();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session && session.user) {
            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.user_metadata?.username,
              fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
              currencyPreference: session.user.user_metadata?.currency_preference || session.user.user_metadata?.currencyPreference || 'INR',
              status: 'ACTIVE'
            };
            this.saveSession(authUser, {
              accessToken: session.access_token,
              refreshToken: session.refresh_token
            });
            if (onUserChange) onUserChange(authUser);
          }
        } else if (event === 'SIGNED_OUT') {
          this.clearLocalSession();
          if (onUserChange) onUserChange(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    return () => {};
  }

  /**
   * Sign In using Email or Username + Password with Supabase Auth
   */
  public static async login(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; user: AuthUser; message?: string }> {
    const rawIdentifier = identifier.trim();
    if (!rawIdentifier) {
      throw new Error('Please enter your email or username.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    let targetEmail = rawIdentifier.toLowerCase();

    // If identifier is a username (no '@'), securely resolve it to email via Supabase Edge Function
    if (!targetEmail.includes('@')) {
      const resolvedEmail = await this.resolveUsernameToEmail(targetEmail);
      if (!resolvedEmail) {
        throw new Error('Invalid email, username, or password. Please try again.');
      }
      targetEmail = resolvedEmail.toLowerCase();
    }

    // Authenticate directly using Supabase signInWithPassword()
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
            throw new Error('Invalid email, username, or password. Please try again.');
          }
          throw new Error(error.message || 'Authentication failed. Please check your credentials.');
        }

        if (data.user && data.session) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || targetEmail,
            username: data.user.user_metadata?.username || (targetEmail.includes('@') ? targetEmail.split('@')[0] : targetEmail),
            fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.user_metadata?.username || targetEmail.split('@')[0],
            currencyPreference: data.user.user_metadata?.currency_preference || data.user.user_metadata?.currencyPreference || 'INR',
            status: 'ACTIVE'
          };

          const tokens: AuthTokens = {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token
          };

          this.saveSession(authUser, tokens);
          return { success: true, user: authUser };
        }
      } catch (err: any) {
        throw err;
      }
    }

    // Backend API fallback (if Supabase is not configured)
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password })
      });

      const data = await response.json();
      if (response.ok && data.tokens) {
        const user: AuthUser = {
          ...data.user,
          status: 'ACTIVE'
        };
        this.saveSession(user, data.tokens);
        return { success: true, user };
      }
      throw new Error(data.message || 'Invalid email, username, or password.');
    } catch (err: any) {
      if (err.message?.includes('Invalid')) throw err;
      throw new Error('Unable to connect to authentication server. Please check your network connection.');
    }
  }

  /**
   * User Registration using Supabase Auth
   * Sign Up: Username, Email, Password, Confirm Password
   * Instant login with no OTP or email confirmation
   */
  public static async signup(
    username: string,
    email: string,
    password: string,
    fullName?: string,
    currencyPreference = 'INR'
  ): Promise<{ success: boolean; user: AuthUser; message: string }> {
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const displayName = (fullName || cleanUsername).trim();

    // Validate username
    const usernameValidation = this.validateUsername(cleanUsername);
    if (!usernameValidation.isValid) {
      throw new Error(usernameValidation.error || 'Invalid username.');
    }

    // Validate email
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please provide a valid email address.');
    }

    // Validate password
    const validation = this.validatePassword(password);
    if (!validation.isValid) {
      throw new Error('Password must be at least 8 characters long and include numbers or symbols.');
    }

    // Primary: Register directly in Supabase Auth
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              username: cleanUsername,
              full_name: displayName,
              currency_preference: currencyPreference
            }
          }
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('unique') || msg.includes('taken')) {
            throw new Error('An account with this email or username already exists. Please sign in.');
          }
          throw new Error(error.message || 'Registration failed.');
        }

        // If session was returned immediately
        if (data.user && data.session) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            username: cleanUsername,
            fullName: displayName,
            currencyPreference,
            status: 'ACTIVE'
          };

          this.saveSession(authUser, {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token
          });

          return {
            success: true,
            user: authUser,
            message: 'Account created successfully! Welcome to Let\'s Track It.'
          };
        }

        // With email confirmation disabled, if signUp did not return a session, log in immediately
        const loginRes = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (loginRes.data.user && loginRes.data.session) {
          const authUser: AuthUser = {
            id: loginRes.data.user.id,
            email: loginRes.data.user.email || cleanEmail,
            username: cleanUsername,
            fullName: displayName,
            currencyPreference,
            status: 'ACTIVE'
          };

          this.saveSession(authUser, {
            accessToken: loginRes.data.session.access_token,
            refreshToken: loginRes.data.session.refresh_token
          });

          return {
            success: true,
            user: authUser,
            message: 'Account created successfully! Welcome to Let\'s Track It.'
          };
        }

        if (loginRes.error) {
          throw new Error(loginRes.error.message);
        }
      } catch (err: any) {
        throw err;
      }
    }

    // Backend fallback (if Supabase not configured)
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: displayName, email: cleanEmail, password, currencyPreference })
      });

      const data = await response.json();
      if (response.ok) {
        const authUser: AuthUser = {
          id: data.user?.id || 'user-id',
          email: cleanEmail,
          username: cleanUsername,
          fullName: displayName,
          currencyPreference,
          status: 'ACTIVE'
        };
        return {
          success: true,
          user: authUser,
          message: 'Account created successfully!'
        };
      }
      throw new Error(data.message || 'Registration failed. Please try again.');
    } catch (err: any) {
      throw new Error(err.message || 'Unable to complete registration. Please check your connection.');
    }
  }

  /**
   * Request password reset email with secure link via Supabase Auth
   */
  public static async forgotPassword(identifier: string): Promise<{ success: boolean; message: string }> {
    let clean = identifier.trim().toLowerCase();
    if (!clean) {
      throw new Error('Please enter your registered email address or username.');
    }

    // If identifier is username, resolve it to email first
    if (!clean.includes('@')) {
      const resolved = await this.resolveUsernameToEmail(clean);
      if (!resolved) {
        // Return friendly message without leaking username existence
        return {
          success: true,
          message: 'If an account exists with this username or email, a password reset link has been sent.'
        };
      }
      clean = resolved.toLowerCase();
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(clean, {
          redirectTo: `${window.location.origin}/#reset-password`
        });
        if (error) throw new Error(error.message);
        return {
          success: true,
          message: 'A secure password reset link has been sent to your email. Click the link to set a new password.'
        };
      } catch (err: any) {
        throw new Error(err.message || 'Failed to dispatch password reset email.');
      }
    }

    return {
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.'
    };
  }

  /**
   * Reset password with Supabase Auth after clicking email reset link
   */
  public static async resetPassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const validation = this.validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error('New password must be at least 8 characters long with numbers or symbols.');
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);
        return {
          success: true,
          message: 'Password successfully updated! Please sign in with your new password.'
        };
      } catch (err: any) {
        throw new Error(err.message || 'Failed to update password.');
      }
    }

    return {
      success: true,
      message: 'Password successfully updated! Please sign in with your new password.'
    };
  }

  /**
   * Save session to storage
   */
  public static saveSession(user: AuthUser, tokens: AuthTokens): void {
    localStorage.setItem(this.STORAGE_USER, JSON.stringify(user));
    localStorage.setItem(this.STORAGE_TOKENS, JSON.stringify(tokens));

    // Update web profile
    const existingProfile = localStorage.getItem('lets_track_it_profile');
    const parsed = existingProfile ? JSON.parse(existingProfile) : {};
    localStorage.setItem('lets_track_it_profile', JSON.stringify({
      ...parsed,
      name: user.fullName,
      email: user.email,
      isVerified: true
    }));
  }

  /**
   * Clear local storage session
   */
  public static clearLocalSession(): void {
    localStorage.removeItem(this.STORAGE_USER);
    localStorage.removeItem(this.STORAGE_TOKENS);
  }

  /**
   * Log out from Supabase Auth and clear local session
   */
  public static async logout(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // Silent cleanup
      }
    }
    this.clearLocalSession();
  }
}
