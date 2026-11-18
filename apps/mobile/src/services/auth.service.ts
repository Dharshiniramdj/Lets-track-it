import { supabase, isSupabaseConfigured } from './supabaseClient';
import { storage } from './storage.service';
import { MobileUserProfile } from '../store/authStore';
import { MobileAccount, useAccountStore } from '../store/accountStore';
import { useTransactionStore } from '../store/transactionStore';
import { useGoalStore } from '../store/goalStore';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: MobileUserProfile;
  tokens: AuthTokens;
  message?: string;
}

export class MobileAuthService {
  /**
   * Securely resolve username to email via Postgres RPC or fallback queries
   */
  public static async resolveUsernameToEmail(username: string): Promise<string | null> {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) return null;

    if (!isSupabaseConfigured()) {
      return null;
    }

    // 1. Try Postgres RPC routine (SECURITY DEFINER)
    try {
      const { data, error } = await supabase.rpc('lookup_username_email', {
        p_username: cleanUsername
      });

      if (!error && data && typeof data === 'string' && data.includes('@')) {
        return data.trim().toLowerCase();
      }
    } catch {
      // Continue to next resolution strategy
    }

    // 2. Query public profiles table
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (!error && data?.email) {
        return data.email.trim().toLowerCase();
      }
    } catch {
      // Continue to edge function fallback
    }

    // 3. Try Supabase Edge Function fallback
    try {
      const { data, error } = await supabase.functions.invoke('resolve-username', {
        body: { username: cleanUsername }
      });
      if (!error && data?.email) {
        return data.email.trim().toLowerCase();
      }
    } catch {
      // All resolution strategies exhausted
    }

    return null;
  }

  /**
   * Sign In using Email or Username + Password with Supabase Auth
   * No OTP required
   */
  public static async login(identifier: string, password: string): Promise<AuthResult> {
    const rawIdentifier = identifier.trim();
    if (!rawIdentifier) {
      throw new Error('Please enter your email or username.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    let targetEmail = rawIdentifier.toLowerCase();

    // If identifier doesn't contain '@', resolve username to email
    if (!targetEmail.includes('@')) {
      const resolvedEmail = await this.resolveUsernameToEmail(targetEmail);
      if (!resolvedEmail) {
        throw new Error('Invalid email, username, or password. Please try again.');
      }
      targetEmail = resolvedEmail;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('invalid login credentials') ||
        msg.includes('invalid credentials') ||
        msg.includes('user not found')
      ) {
        throw new Error('Invalid email, username, or password. Please try again.');
      }
      throw new Error(error.message || 'Authentication failed. Please check your credentials.');
    }

    if (!data.user || !data.session) {
      throw new Error('Could not establish an authenticated session. Please try again.');
    }

    const user: MobileUserProfile = {
      id: data.user.id,
      email: data.user.email || targetEmail,
      fullName:
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.user_metadata?.username ||
        targetEmail.split('@')[0],
      currencyPreference:
        data.user.user_metadata?.currency_preference ||
        data.user.user_metadata?.currencyPreference ||
        'INR',
      hasBiometrics: false
    };

    const tokens: AuthTokens = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token
    };

    await storage.setTokens(tokens.accessToken, tokens.refreshToken);
    await storage.setUser(user);

    return { user, tokens };
  }

  /**
   * Sign Up with Full Name, Email, Password (and optional Username)
   * Instant authentication without OTP
   */
  public static async signup(params: {
    fullName: string;
    email: string;
    password: string;
    username?: string;
    currencyPreference?: string;
  }): Promise<AuthResult> {
    const { fullName, email, password, username, currencyPreference = 'INR' } = params;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanUsername = (username || cleanName.replace(/\s+/g, '_') || cleanEmail.split('@')[0]).toLowerCase();

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please provide a valid email address.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          username: cleanUsername,
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
      const user: MobileUserProfile = {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        fullName: cleanName,
        currencyPreference,
        hasBiometrics: false
      };

      const tokens: AuthTokens = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      };

      await storage.setTokens(tokens.accessToken, tokens.refreshToken);
      await storage.setUser(user);

      return { user, tokens, message: 'Account created successfully!' };
    }

    // If auto-confirmed but no session returned in signUp, sign in directly
    const loginRes = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (loginRes.data.user && loginRes.data.session) {
      const user: MobileUserProfile = {
        id: loginRes.data.user.id,
        email: loginRes.data.user.email || cleanEmail,
        fullName: cleanName,
        currencyPreference,
        hasBiometrics: false
      };

      const tokens: AuthTokens = {
        accessToken: loginRes.data.session.access_token,
        refreshToken: loginRes.data.session.refresh_token
      };

      await storage.setTokens(tokens.accessToken, tokens.refreshToken);
      await storage.setUser(user);

      return { user, tokens, message: 'Account created successfully!' };
    }

    if (loginRes.error) {
      throw new Error(loginRes.error.message || 'Account created. Please log in.');
    }

    throw new Error('Registration completed. Please sign in.');
  }

  /**
   * Load accounts for authenticated user from Supabase
   */
  public static async loadAccounts(userId: string): Promise<MobileAccount[]> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

      if (!error && data && data.length > 0) {
        return data.map((acc: any) => ({
          id: acc.id,
          name: acc.name || 'Personal',
          type: (acc.type as any) || 'PERSONAL',
          color: acc.color || '#FC734D',
          avatarSeed: acc.avatar_seed || 'User',
          ownerId: acc.user_id || userId,
          members: [{ userId, role: 'OWNER' as const }]
        }));
      }
    } catch (e) {
      console.warn('Could not load accounts from Supabase:', e);
    }

    // Default fallback account
    return [
      {
        id: `acc-${userId}`,
        name: 'Personal Vault',
        type: 'PERSONAL',
        color: '#FC734D',
        avatarSeed: 'User',
        ownerId: userId,
        members: [{ userId, role: 'OWNER' }]
      }
    ];
  }

  /**
   * Restore existing session from Supabase and persistent storage
   */
  public static async restoreSession(): Promise<{ user: MobileUserProfile; tokens: AuthTokens } | null> {
    try {
      // 1. Check Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.user) {
        const user: MobileUserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          fullName:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.user_metadata?.username ||
            session.user.email?.split('@')[0] ||
            'User',
          currencyPreference:
            session.user.user_metadata?.currency_preference ||
            session.user.user_metadata?.currencyPreference ||
            'INR',
          hasBiometrics: false
        };

        const tokens: AuthTokens = {
          accessToken: session.access_token,
          refreshToken: session.refresh_token
        };

        await storage.setTokens(tokens.accessToken, tokens.refreshToken);
        await storage.setUser(user);

        return { user, tokens };
      }

      // 2. Check local persistent storage fallback
      const { accessToken, refreshToken } = await storage.getTokens();
      const savedUser = await storage.getUser();
      if (accessToken && refreshToken && savedUser) {
        try {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
        } catch {
          // Ignore transient session set error
        }
        return { user: savedUser, tokens: { accessToken, refreshToken } };
      }
    } catch (e) {
      console.warn('Error during session restoration:', e);
    }

    return null;
  }

  /**
   * Log out from Supabase and clear persistent tokens
   */
  public static async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on signout
    }
    await storage.clearSession();
    try {
      useTransactionStore.getState().clearTransactions();
      useGoalStore.getState().clearGoals();
      useAccountStore.getState().setAccounts([]);
    } catch {
      // Ignore store reset error
    }
  }
}
