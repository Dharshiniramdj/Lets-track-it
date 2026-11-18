import { MySqlPool } from './mysql.pool.js';

async function main() {
  console.log('🔄 Connecting to XAMPP MariaDB/MySQL and setting up database schema...');
  const res = await MySqlPool.testAndInitialize();
  if (res.ok) {
    console.log('✅ Database and all tables (users, transactions, budgets, notifications, ai_insights, embeddings) are ready.');
    process.exit(0);
  } else {
    console.error('❌ Failed to connect to MySQL:', res.message);
    console.log('💡 TIP: Please ensure XAMPP MySQL is started in the XAMPP Control Panel on port 3306.');
    process.exit(1);
  }
}

main();
