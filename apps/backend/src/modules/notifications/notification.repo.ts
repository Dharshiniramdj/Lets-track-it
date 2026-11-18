import { MySqlPool } from '../../common/db/mysql.pool.js';
import { NotificationRecord } from '../../common/db/data-store.js';

export class NotificationRepository {
  /**
   * Persists a notification into MySQL using parameterized SQL
   */
  public static async save(userId: string, record: NotificationRecord): Promise<void> {
    if (!MySqlPool.isAvailable()) return;

    const sql = `
      INSERT INTO notifications (
        id, user_id, title, message, type, category, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        is_read = VALUES(is_read);
    `;

    await MySqlPool.query(sql, [
      record.id,
      userId,
      record.title,
      record.message,
      record.type,
      record.category,
      record.read ? 1 : 0,
      record.createdAt
    ]);
  }

  /**
   * Retrieves notifications for a user from MySQL
   */
  public static async findByUser(userId: string, filters?: { read?: boolean; category?: string }): Promise<NotificationRecord[]> {
    if (!MySqlPool.isAvailable()) return [];

    let sql = `SELECT * FROM notifications WHERE user_id = ?`;
    const params: any[] = [userId];

    if (filters?.read !== undefined) {
      sql += ` AND is_read = ?`;
      params.push(filters.read ? 1 : 0);
    }

    if (filters?.category) {
      sql += ` AND category = ?`;
      params.push(filters.category);
    }

    sql += ` ORDER BY created_at DESC;`;

    const rows = await MySqlPool.query<any[]>(sql, params);
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      message: r.message,
      type: r.type,
      category: r.category,
      read: Boolean(r.is_read),
      createdAt: Number(r.created_at)
    }));
  }

  /**
   * Marks a notification as read
   */
  public static async markRead(userId: string, notificationId: string): Promise<boolean> {
    if (!MySqlPool.isAvailable()) return true;

    const sql = `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?;`;
    const result = await MySqlPool.query<any>(sql, [notificationId, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Marks all notifications as read for a user
   */
  public static async markAllRead(userId: string): Promise<number> {
    if (!MySqlPool.isAvailable()) return 0;

    const sql = `UPDATE notifications SET is_read = 1 WHERE user_id = ?;`;
    const result = await MySqlPool.query<any>(sql, [userId]);
    return result.affectedRows;
  }

  /**
   * Deletes a notification
   */
  public static async delete(userId: string, notificationId: string): Promise<boolean> {
    if (!MySqlPool.isAvailable()) return true;

    const sql = `DELETE FROM notifications WHERE id = ? AND user_id = ?;`;
    const result = await MySqlPool.query<any>(sql, [notificationId, userId]);
    return result.affectedRows > 0;
  }
}
