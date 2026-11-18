import { AppNotification } from '../types';
import { AuthService } from './authService';

const API_BASE = 'http://localhost:4000/api/v1';

export class NotificationService {
  private static STORAGE_KEY = 'letstrackit_local_notifications';

  /**
   * Fetches user-scoped notifications from backend API with fallback
   */
  public static async getNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const tokens = AuthService.getTokens();

    if (tokens?.accessToken) {
      try {
        const response = await fetch(`${API_BASE}/notifications`, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Sync with local cache
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data.notifications));
          return {
            notifications: data.notifications,
            unreadCount: data.unreadCount
          };
        }
      } catch (e) {
        console.warn('Backend notification fetch fallback active');
      }
    }

    // Fallback to local storage
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const notifications: AppNotification[] = raw ? JSON.parse(raw) : [];
      const unreadCount = notifications.filter(n => !n.read).length;
      return { notifications, unreadCount };
    } catch {
      return { notifications: [], unreadCount: 0 };
    }
  }

  /**
   * Marks notification as read
   */
  public static async markAsRead(id: string): Promise<void> {
    const tokens = AuthService.getTokens();

    if (tokens?.accessToken) {
      try {
        await fetch(`${API_BASE}/notifications/${id}/read`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          }
        });
      } catch (e) {
        // Continue to local update
      }
    }

    // Update local storage cache
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    }
  }

  /**
   * Marks all notifications as read
   */
  public static async markAllAsRead(): Promise<void> {
    const tokens = AuthService.getTokens();

    if (tokens?.accessToken) {
      try {
        await fetch(`${API_BASE}/notifications/mark-all-read`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          }
        });
      } catch (e) {
        // Continue to local update
      }
    }

    // Update local storage cache
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.map(n => ({ ...n, read: true }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    }
  }

  /**
   * Deletes / dismisses a notification
   */
  public static async deleteNotification(id: string): Promise<void> {
    const tokens = AuthService.getTokens();

    if (tokens?.accessToken) {
      try {
        await fetch(`${API_BASE}/notifications/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          }
        });
      } catch (e) {
        // Continue to local delete
      }
    }

    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.filter(n => n.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    }
  }

  /**
   * Adds an in-app notification locally and triggers optional desktop push
   */
  public static createLocalNotification(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'danger' = 'info',
    category: 'TRANSACTION' | 'DELIVERY' | 'BUDGET' | 'SECURITY' | 'SYSTEM' = 'SYSTEM'
  ): AppNotification {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title,
      message,
      type,
      category,
      timestamp: Date.now(),
      read: false
    };

    const raw = localStorage.getItem(this.STORAGE_KEY);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    const updated = [newNotif, ...list];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));

    // Optional browser push notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico'
        });
      } catch (e) {
        // Ignore desktop notification errors
      }
    }

    return newNotif;
  }
}
