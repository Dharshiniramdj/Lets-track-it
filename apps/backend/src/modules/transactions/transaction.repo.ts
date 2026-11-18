import { MySqlPool } from '../../common/db/mysql.pool.js';
import { TransactionRecord } from '../../common/db/data-store.js';

export class TransactionRepository {
  /**
   * Persists a transaction into MySQL using parameterized SQL
   */
  public static async save(userId: string, record: TransactionRecord): Promise<void> {
    if (!MySqlPool.isAvailable()) return;

    const sql = `
      INSERT INTO transactions (
        id, user_id, account_id, amount, type, mode, platform,
        purpose, category, date, shopping_details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        amount = VALUES(amount),
        type = VALUES(type),
        mode = VALUES(mode),
        platform = VALUES(platform),
        purpose = VALUES(purpose),
        category = VALUES(category),
        date = VALUES(date),
        shopping_details = VALUES(shopping_details);
    `;

    const shoppingDetailsJson = record.shoppingDetails ? JSON.stringify(record.shoppingDetails) : null;

    await MySqlPool.query(sql, [
      record.id,
      userId,
      record.accountId,
      record.amount,
      record.type,
      record.mode,
      record.platform,
      record.purpose,
      record.category,
      record.date,
      shoppingDetailsJson,
      record.createdAt
    ]);
  }

  /**
   * Retrieves transactions for a user from MySQL with parameterized filtering
   */
  public static async findByUser(userId: string, filters: {
    accountId?: string;
    category?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    month?: string;
  } = {}): Promise<TransactionRecord[]> {
    if (!MySqlPool.isAvailable()) return [];

    let sql = `SELECT * FROM transactions WHERE user_id = ?`;
    const params: any[] = [userId];

    if (filters.accountId) {
      sql += ` AND account_id = ?`;
      params.push(filters.accountId);
    }
    if (filters.category) {
      sql += ` AND UPPER(category) = UPPER(?)`;
      params.push(filters.category);
    }
    if (filters.type) {
      sql += ` AND type = ?`;
      params.push(filters.type);
    }
    if (filters.month) {
      sql += ` AND date LIKE ?`;
      params.push(`${filters.month}%`);
    }
    if (filters.startDate) {
      sql += ` AND date >= ?`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      sql += ` AND date <= ?`;
      params.push(filters.endDate);
    }

    sql += ` ORDER BY date DESC, created_at DESC;`;

    const rows = await MySqlPool.query<any[]>(sql, params);
    return rows.map(r => ({
      id: r.id,
      accountId: r.account_id,
      amount: parseFloat(r.amount),
      type: r.type,
      mode: r.mode,
      platform: r.platform,
      purpose: r.purpose,
      category: r.category,
      date: r.date,
      shoppingDetails: typeof r.shopping_details === 'string'
        ? JSON.parse(r.shopping_details)
        : r.shopping_details || undefined,
      createdAt: Number(r.created_at)
    }));
  }

  /**
   * Deletes a transaction from MySQL ensuring user ownership
   */
  public static async delete(userId: string, transactionId: string): Promise<boolean> {
    if (!MySqlPool.isAvailable()) return true;

    const sql = `DELETE FROM transactions WHERE id = ? AND user_id = ?;`;
    const result = await MySqlPool.query<any>(sql, [transactionId, userId]);
    return result.affectedRows > 0;
  }
}
