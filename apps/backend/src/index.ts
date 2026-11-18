import { buildApp } from './app.js';
import { MySqlPool } from './common/db/mysql.pool.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  const app = buildApp();
  try {
    // Attempt connecting to XAMPP MariaDB/MySQL
    await MySqlPool.testAndInitialize();

    const address = await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 [Let's Track It API Server] running at ${address}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    console.error('Fatal error starting backend server:', err);
    process.exit(1);
  }
}

bootstrap();
