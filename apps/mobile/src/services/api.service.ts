import { storage } from './storage.service';
import { useAuthStore } from '../store/authStore';
import { useOfflineQueueStore, QueuedMutation } from '../store/offlineQueueStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  idempotencyKey?: string;
  skipAuth?: boolean;
}

export class ApiClient {
  public static async request<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const isOnline = useOfflineQueueStore.getState().isOnline;
    const method = options.method || 'GET';

    // If offline and making a state-changing mutation, queue it locally with Idempotency-Key
    if (!isOnline && method !== 'GET') {
      const idempotencyKey = options.idempotencyKey || `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      useOfflineQueueStore.getState().enqueueMutation({
        idempotencyKey,
        endpoint,
        method,
        payload: options.body
      });

      // Optimistically resolve with simulated response
      return {
        ...options.body,
        id: `optimistic-${Date.now()}`,
        idempotencyKey,
        createdAt: Date.now(),
        __isOptimistic: true
      } as unknown as T;
    }

    const { accessToken } = await storage.getTokens();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (accessToken && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out. Check if backend is running or use Demo Mode.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle token refresh on 401
    if (response.status === 401 && !options.skipAuth) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry with new token
        const { accessToken: newToken } = await storage.getTokens();
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined
        });
        if (!retryRes.ok) throw await retryRes.json();
        return retryRes.json() as Promise<T>;
      } else {
        useAuthStore.getState().logout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ message: 'Network response was not ok' }));
      throw errorJson;
    }

    return response.json() as Promise<T>;
  }

  private static async tryRefreshToken(): Promise<boolean> {
    try {
      const { refreshToken } = await storage.getTokens();
      if (!refreshToken) return false;

      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!refreshRes.ok) return false;

      const data = await refreshRes.json();
      await storage.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Syncs queued offline mutations when connectivity is restored
   */
  public static async syncOfflineQueue(): Promise<{ syncedCount: number; errors: number }> {
    const queue = [...useOfflineQueueStore.getState().queue];
    if (queue.length === 0) return { syncedCount: 0, errors: 0 };

    useOfflineQueueStore.getState().setSyncing(true);
    let syncedCount = 0;
    let errors = 0;

    for (const item of queue) {
      try {
        await this.request(item.endpoint, {
          method: item.method,
          body: item.payload,
          idempotencyKey: item.idempotencyKey
        });
        useOfflineQueueStore.getState().dequeueMutation(item.id);
        syncedCount += 1;
      } catch (err) {
        console.error('Failed to sync offline mutation:', item.id, err);
        errors += 1;
      }
    }

    useOfflineQueueStore.getState().setSyncing(false);
    return { syncedCount, errors };
  }
}
