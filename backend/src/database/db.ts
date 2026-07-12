import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import path from 'path';
import dotenv from 'dotenv';

// Ensure environment variables are loaded (crucial for seeds and migrations)
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Parses a mysql:// connection string into options compatible with the MariaDB/MySQL adapter.
 */
function parseDatabaseUrl(url: string | undefined) {
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'mysql:') {
      throw new Error('Database protocol must be mysql:');
    }

    return {
      host: parsedUrl.hostname || 'localhost',
      port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 3306,
      user: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password),
      database: parsedUrl.pathname.replace(/^\//, ''),
      connectionLimit: 15 // Optimizing connections for scalability
    };
  } catch (err: any) {
    throw new Error(`Invalid DATABASE_URL format: ${err.message}`);
  }
}

let prisma: PrismaClient;

try {
  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  const adapter = new PrismaMariaDb(dbConfig);
  prisma = new PrismaClient({ adapter });
} catch (error) {
  console.error('[Prisma Initialization Error] Failed to connect to MySQL:', error);
  throw error;
}

export default prisma;
export { prisma };
