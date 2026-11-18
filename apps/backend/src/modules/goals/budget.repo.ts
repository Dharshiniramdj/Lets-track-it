import { MySqlPool } from '../../common/db/mysql.pool.js';
import { SavingsGoalRecord } from '../../common/db/data-store.js';

export class BudgetRepository {
  /**
   * Persists a budget / savings goal into MySQL using parameterized query
   */
  public static async save(userId: string, record: SavingsGoalRecord): Promise<void> {
    if (!MySqlPool.isAvailable()) return;

    const sql = `
      INSERT INTO budgets (
        id, user_id, account_id, category, amount, period, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        amount = VALUES(amount),
        notes = VALUES(notes);
    `;

    await MySqlPool.query(sql, [
      record.id,
      userId,
      record.accountId,
      record.category,
      record.targetAmount,
      record.month,
      record.notes || null,
      record.createdAt
    ]);
  }

  /**
   * Retrieves budgets for a user
   */
  public static async findByUser(userId: string, period?: string): Promise<SavingsGoalRecord[]> {
    if (!MySqlPool.isAvailable()) return [];

    let sql = `SELECT * FROM budgets WHERE user_id = ?`;
    const params: any[] = [userId];

    if (period) {
      sql += ` AND period = ?`;
      params.push(period);
    }

    sql += ` ORDER BY category ASC;`;

    const rows = await MySqlPool.query<any[]>(sql, params);
    return rows.map(r => ({
      id: r.id,
      accountId: r.account_id,
      category: r.category,
      targetAmount: parseFloat(r.amount),
      month: r.period,
      notes: r.notes || undefined,
      createdAt: Number(r.created_at)
    }));
  }

  /**
   * Deletes a budget
   */
  public static async delete(userId: string, goalId: string): Promise<boolean> {
    if (!MySqlPool.isAvailable()) return true;

    const sql = `DELETE FROM budgets WHERE id = ? AND user_id = ?;`;
    const result = await MySqlPool.query<any>(sql, [goalId, userId]);
    return result.affectedRows > 0;
  }
}
