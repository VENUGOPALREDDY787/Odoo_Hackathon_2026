import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import path from 'path';
import dotenv from 'dotenv';

// Ensure environment variables are loaded (crucial for seeds and migrations)
dotenv.config({ path: path.join(__dirname, '../../.env') });

function parseMysqlConnectionString(connectionString: string) {
  const raw = connectionString.trim().replace(/^['"]|['"]$/g, '');
  const prefix = 'mysql://';
  if (!raw.startsWith(prefix)) {
    throw new Error('DATABASE_URL must start with mysql://');
  }

  const urlWithoutProtocol = raw.slice(prefix.length);
  const [credentials, hostAndPath] = urlWithoutProtocol.split(/@(?=[^@]+$)/);
  if (!credentials || !hostAndPath) {
    throw new Error('DATABASE_URL is not in a valid mysql connection format.');
  }

  const [user, ...passwordParts] = credentials.split(':');
  const password = passwordParts.join(':');
  if (!user || password === undefined) {
    throw new Error('DATABASE_URL must include username and password.');
  }

  const [hostPort, ...pathParts] = hostAndPath.split('/');
  const database = pathParts.join('/').split('?')[0];
  if (!hostPort || !database) {
    throw new Error('DATABASE_URL must include host, port, and database name.');
  }

  const [host, portString] = hostPort.split(':');
  const port = portString ? Number(portString) : 3306;
  if (!host || Number.isNaN(port)) {
    throw new Error('DATABASE_URL must include a valid host and port.');
  }

  return { host, port, user, password, database };
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in the environment.');
}

const dbConfig = parseMysqlConnectionString(databaseUrl);
const adapter = new PrismaMariaDb({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
});

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development'
    ? [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' }
      ]
    : [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' }
      ]
});

(prisma as any).$on('warn', (e: any) => {
  console.warn('[Prisma Warning]', e.message);
});

(prisma as any).$on('error', (e: any) => {
  console.error('[Prisma Error]', e.message);
});

export default prisma;
export { prisma };
