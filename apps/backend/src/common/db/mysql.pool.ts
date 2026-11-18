import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface MySqlConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export class MySqlPool {
  private static pool: Pool | null = null;
  private static isConnected: boolean | null = null;
  private static lastError: string | null = null;

  public static getConfig(): MySqlConfig {
    return {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lets_track_it'
    };
  }

  /**
   * Initializes or gets the active connection pool
   */
  public static getPool(): Pool {
    if (!this.pool) {
      const config = this.getConfig();
      const poolOptions: PoolOptions = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 10,
        idleTimeout: 60000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      };
      this.pool = mysql.createPool(poolOptions);
    }
    return this.pool;
  }

  /**
   * Test connection to MySQL and auto-initialize schema if reachable
   */
  public static async testAndInitialize(): Promise<{ ok: boolean; message: string }> {
    const config = this.getConfig();
    try {
      // 1. Try to connect to MySQL server without database first to ensure DB exists
      const bootstrapConnection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password
      });

      await bootstrapConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      );
      await bootstrapConnection.end();

      // 2. Now initialize tables using the pool
      const pool = this.getPool();
      await this.initSchema(pool);

      this.isConnected = true;
      this.lastError = null;
      console.log(`✅ [MySQL Database] Connected to XAMPP MariaDB/MySQL (\`${config.database}\` on ${config.host}:${config.port})`);
      return { ok: true, message: 'Connected and schema initialized' };
    } catch (err: any) {
      this.isConnected = false;
      const errMsg = err.message || 'Unknown database connection error';
      this.lastError = errMsg;
      console.warn(`⚠️ [MySQL Database] XAMPP MySQL not reachable at ${config.host}:${config.port}: ${errMsg}`);
      return { ok: false, message: errMsg };
    }
  }

  /**
   * Returns current connection availability state
   */
  public static isAvailable(): boolean {
    return this.isConnected === true;
  }

  public static getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Execute parameterized query
   */
  public static async query<T extends RowDataPacket[] | ResultSetHeader>(
    sql: string,
    params: any[] = []
  ): Promise<T> {
    const pool = this.getPool();
    const [results] = await pool.execute(sql, params);
    return results as T;
  }

  /**
   * Closes the connection pool
   */
  public static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = null;
    }
  }

  /**
   * Creates the required tables in XAMPP MariaDB/MySQL
   */
  public static async initSchema(pool: Pool): Promise<void> {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        currency_preference VARCHAR(10) DEFAULT 'INR',
        avatar_seed VARCHAR(255) DEFAULT 'Felix',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createTransactionsTable = `
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        account_id VARCHAR(36) DEFAULT 'default',
        amount DECIMAL(12,2) NOT NULL,
        type VARCHAR(20) NOT NULL,
        mode VARCHAR(30) DEFAULT 'UPI',
        platform VARCHAR(50) DEFAULT 'Offline',
        purpose VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        date VARCHAR(30) NOT NULL,
        shopping_details JSON NULL,
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_transactions_user_date (user_id, date),
        INDEX idx_transactions_category (user_id, category),
        CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createBudgetsTable = `
      CREATE TABLE IF NOT EXISTS budgets (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        account_id VARCHAR(36) DEFAULT 'default',
        category VARCHAR(50) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        period VARCHAR(7) NOT NULL,
        notes TEXT NULL,
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_category_period (user_id, category, period),
        CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createNotificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) NOT NULL,
        category VARCHAR(50) DEFAULT 'SYSTEM',
        is_read TINYINT(1) DEFAULT 0,
        created_at BIGINT NOT NULL,
        INDEX idx_notifications_user_read (user_id, is_read),
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createAiInsightsTable = `
      CREATE TABLE IF NOT EXISTS ai_insights (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        insight_type VARCHAR(50) NOT NULL,
        forecast JSON NULL,
        explanation TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        INDEX idx_ai_insights_user (user_id, created_at),
        CONSTRAINT fk_ai_insights_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createEmbeddingsTable = `
      CREATE TABLE IF NOT EXISTS embeddings (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        reference_id VARCHAR(36) NULL,
        content_text TEXT NOT NULL,
        embedding_vector JSON NOT NULL,
        created_at BIGINT NOT NULL,
        INDEX idx_embeddings_user (user_id),
        CONSTRAINT fk_embeddings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.query(createUsersTable);
    await pool.query(createTransactionsTable);
    await pool.query(createBudgetsTable);
    await pool.query(createNotificationsTable);
    await pool.query(createAiInsightsTable);
    await pool.query(createEmbeddingsTable);
  }
}
