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

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      host: parsedUrl.hostname || 'localhost',
      port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 3306,
      user: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password),
      database: parsedUrl.pathname.replace(/^\//, ''),

      // ─── Connection Pool Configuration ────────────────────────────────────
      // Production: 100 connections, supports 500+ orgs + concurrent requests
      // Development: 20 connections, enough for local development
      connectionLimit: isProduction ? 100 : 20,

      // Wait for a connection rather than throwing if pool is exhausted
      waitForConnections: true,

      // 0 = unlimited queue; requests wait indefinitely for a free connection
      queueLimit: 0,

      // Abort connection acquisition after 60s (prevents indefinite hang)
      acquireTimeout: 60000,

      // Keepalive prevents idle connections from being dropped by firewalls/LB
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,

      // Reconnect idle connections that have been disconnected
      connectTimeout: 10000,
    };
  } catch (err: any) {
    throw new Error(`Invalid DATABASE_URL format: ${err.message}`);
  }
}

let prisma: PrismaClient;

try {
  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  const adapter = new PrismaMariaDb(dbConfig);

  prisma = new PrismaClient({
    adapter,
    // Log slow queries in development and staging (not production — too verbose)
    log: process.env.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' }
        ]
      : [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' }
        ]
  });

  // ─── Slow Query Logger ─────────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    (prisma as any).$on('query', (e: any) => {
      if (e.duration > 200) {
        console.warn(
          `[SlowQuery] ${e.duration}ms | ${e.query.substring(0, 200)}`
        );
      }
    });
  }

  (prisma as any).$on('warn', (e: any) => {
    console.warn('[Prisma Warning]', e.message);
  });

  (prisma as any).$on('error', (e: any) => {
    console.error('[Prisma Error]', e.message);
  });

} catch (error) {
  console.error('[Prisma Initialization Error] Failed to connect to MySQL:', error);
  throw error;
}

export default prisma;
export { prisma };
