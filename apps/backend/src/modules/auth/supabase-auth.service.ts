import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { ApiError } from '../../common/errors/api-error.js';
import { MySqlPool } from '../../common/db/mysql.pool.js';
import { DataStore } from '../../common/db/data-store.js';

export interface VerifiedAuthUser {
  id: string; // Supabase user UUID
  email: string;
  fullName: string;
  currencyPreference: string;
}

export class SupabaseAuthService {
  private static client: SupabaseClient | null = null;

  public static getClient(): SupabaseClient | null {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key || url.includes('your-project') || url.includes('placeholder')) {
      return null;
    }

    if (!this.client) {
      try {
        this.client = createClient(url, key, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
      } catch (err) {
        console.error('Failed to initialize Supabase server client:', err);
        return null;
      }
    }
    return this.client;
  }

  /**
   * Verifies a Supabase Bearer access token on the server
   * Extracts authenticated user UUID from verified token
   */
  public static async verifyAccessToken(token: string): Promise<VerifiedAuthUser> {
    if (!token) {
      throw ApiError.unauthorized('Bearer token cannot be empty');
    }

    // 1. Try Live Supabase Auth verification if configured
    const client = this.getClient();
    if (client) {
      try {
        const { data: { user }, error } = await client.auth.getUser(token);
        if (error || !user) {
          throw new Error(error?.message || 'Invalid Supabase session');
        }

        const authUser: VerifiedAuthUser = {
          id: user.id,
          email: user.email || '',
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          currencyPreference: user.user_metadata?.currencyPreference || 'INR'
        };

        // Sync user record to MySQL
        await this.syncUserToDatabase(authUser);
        return authUser;
      } catch (err: any) {
        // If Supabase rejected token, check if it's expired or forged
        if (err.message?.includes('expired') || err.message?.includes('Invalid')) {
          throw ApiError.unauthorized(err.message || 'Invalid or expired Supabase access token');
        }
      }
    }

    // 2. Try JWT secret verification (RS256 / HS256)
    const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'lets-track-it-enterprise-secret-key-change-in-prod-32bytes';
    try {
      const decoded: any = jwt.verify(token, jwtSecret);
      const authUser: VerifiedAuthUser = {
        id: decoded.sub,
        email: decoded.email || '',
        fullName: decoded.user_metadata?.full_name || decoded.fullName || decoded.email?.split('@')[0] || 'User',
        currencyPreference: decoded.currencyPreference || 'INR'
      };

      await this.syncUserToDatabase(authUser);
      return authUser;
    } catch (err: any) {
      // 3. Fallback for mock/test tokens (e.g. "mock-jwt-...")
      if (token.startsWith('mock-jwt-') || token.startsWith('test-jwt-')) {
        const authUser: VerifiedAuthUser = {
          id: 'test-user-uuid-1',
          email: 'test@letstrackit.app',
          fullName: 'Test User',
          currencyPreference: 'INR'
        };
        await this.syncUserToDatabase(authUser);
        return authUser;
      }

      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token has expired');
      }
      throw ApiError.unauthorized('Invalid or forged access token');
    }
  }

  /**
   * Upserts the verified Supabase user into XAMPP MySQL and in-memory store
   */
  public static async syncUserToDatabase(user: VerifiedAuthUser): Promise<void> {
    // 1. Sync in-memory DataStore
    if (!DataStore.users.has(user.id)) {
      DataStore.users.set(user.id, {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        passwordHash: 'SUPABASE_MANAGED_AUTH',
        currencyPreference: user.currencyPreference,
        status: 'ACTIVE',
        createdAt: Date.now()
      });
    }

    // 2. Sync to MySQL if pool is available
    if (MySqlPool.isAvailable()) {
      try {
        await MySqlPool.query(
          `INSERT INTO users (id, email, full_name, currency_preference, avatar_seed)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             email = VALUES(email),
             full_name = VALUES(full_name),
             currency_preference = VALUES(currency_preference);`,
          [user.id, user.email, user.fullName, user.currencyPreference, user.fullName]
        );
      } catch (err) {
        console.warn('MySQL user sync warning:', err);
      }
    }
  }
}
