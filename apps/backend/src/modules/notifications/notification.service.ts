import crypto from 'node:crypto';
import { DataStore, NotificationRecord } from '../../common/db/data-store.js';
import { ApiError } from '../../common/errors/api-error.js';
import { NotificationRepository } from './notification.repo.js';

export interface CreateNotificationDto {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
  category?: 'TRANSACTION' | 'DELIVERY' | 'BUDGET' | 'SECURITY' | 'SYSTEM';
}

export class NotificationService {
  /**
   * Generates and stores a new notification for a user
   */
  public static createNotification(userId: string, dto: CreateNotificationDto): NotificationRecord {
    const id = crypto.randomUUID();
    const record: NotificationRecord = {
      id,
      userId,
      title: dto.title.trim(),
      message: dto.message.trim(),
      type: dto.type || 'info',
      category: dto.category || 'SYSTEM',
      read: false,
      createdAt: Date.now()
    };

    DataStore.notifications.set(id, record);
    NotificationRepository.save(userId, record).catch(err => {
      console.warn('MySQL notification save error:', err);
    });
    return record;
  }

  /**
   * Retrieves all notifications belonging strictly to the authenticated user
   */
  public static getUserNotifications(
    userId: string,
    filters?: { read?: boolean; category?: string }
  ): NotificationRecord[] {
    return Array.from(DataStore.notifications.values())
      .filter(n => n.userId === userId)
      .filter(n => {
        if (filters?.read !== undefined && n.read !== filters.read) return false;
        if (filters?.category && n.category !== filters.category) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Marks a specific notification as read, enforcing user isolation
   */
  public static markAsRead(userId: string, notificationId: string): NotificationRecord {
    const notification = DataStore.notifications.get(notificationId);
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    if (notification.userId !== userId) {
      throw ApiError.forbidden('Forbidden: You do not have access to this notification');
    }

    notification.read = true;
    DataStore.notifications.set(notificationId, notification);
    NotificationRepository.markRead(userId, notificationId).catch(err => {
      console.warn('MySQL markRead error:', err);
    });
    return notification;
  }

  /**
   * Marks all notifications for a user as read
   */
  public static markAllAsRead(userId: string): { updatedCount: number } {
    let count = 0;
    for (const [id, notification] of DataStore.notifications.entries()) {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        DataStore.notifications.set(id, notification);
        count++;
      }
    }
    NotificationRepository.markAllRead(userId).catch(err => {
      console.warn('MySQL markAllRead error:', err);
    });
    return { updatedCount: count };
  }

  /**
   * Deletes a notification, ensuring cross-user protection
   */
  public static deleteNotification(userId: string, notificationId: string): boolean {
    const notification = DataStore.notifications.get(notificationId);
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    if (notification.userId !== userId) {
      throw ApiError.forbidden('Forbidden: You do not have access to this notification');
    }

    DataStore.notifications.delete(notificationId);
    NotificationRepository.delete(userId, notificationId).catch(err => {
      console.warn('MySQL notification delete error:', err);
    });
    return true;
  }

  /**
   * Returns count of unread notifications for user
   */
  public static getUnreadCount(userId: string): number {
    return Array.from(DataStore.notifications.values()).filter(
      n => n.userId === userId && !n.read
    ).length;
  }

  /**
   * Budget threshold checking & deduplicated alert generation (80% and 100%)
   */
  public static checkBudgetThresholds(userId: string, accountId: string, category: string): void {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const goal = Array.from(DataStore.goals.values()).find(
      g => g.accountId === accountId && g.category.toUpperCase() === category.toUpperCase() && g.month === currentMonth
    );

    if (!goal || goal.targetAmount <= 0) return;

    // Calculate current spending for this category
    const totalSpent = Array.from(DataStore.transactions.values())
      .filter(t => t.accountId === accountId && t.category.toUpperCase() === category.toUpperCase() && t.type === 'EXPENSE' && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);

    const percent = (totalSpent / goal.targetAmount) * 100;

    // Check if an alert was already issued in the last 24h for this goal threshold
    const existingAlerts = Array.from(DataStore.notifications.values()).filter(
      n => n.userId === userId && n.category === 'BUDGET' && n.title.includes(goal.category) && (Date.now() - n.createdAt < 24 * 60 * 60 * 1000)
    );

    if (percent >= 100) {
      const alreadySent100 = existingAlerts.some(a => a.title.includes('Breached'));
      if (!alreadySent100) {
        this.createNotification(userId, {
          title: `Budget Breached: ${goal.category}`,
          message: `You have spent ₹${totalSpent.toLocaleString()} of your ₹${goal.targetAmount.toLocaleString()} limit (${Math.round(percent)}%). Limit exceeded!`,
          type: 'danger',
          category: 'BUDGET'
        });
      }
    } else if (percent >= 80) {
      const alreadySent80 = existingAlerts.some(a => a.title.includes('Threshold') || a.title.includes('Breached'));
      if (!alreadySent80) {
        this.createNotification(userId, {
          title: `Budget Threshold Alert: ${goal.category}`,
          message: `You have reached ${Math.round(percent)}% of your ₹${goal.targetAmount.toLocaleString()} monthly goal (₹${totalSpent.toLocaleString()} spent).`,
          type: 'warning',
          category: 'BUDGET'
        });
      }
    }
  }
}
