const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const path = require('path');

// Ensure env variables are loaded (helpful when running migrations/seeds directly)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function parseDatabaseUrl(url) {
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }

  // Handle URL format: mysql://user:password@host:port/database
  // Using URL API which is standard in Node.js
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
      connectionLimit: 10
    };
  } catch (err) {
    throw new Error(`Invalid DATABASE_URL format: ${err.message}`);
  }
}

let prisma;

try {
  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  const adapter = new PrismaMariaDb(dbConfig);
  prisma = new PrismaClient({ adapter });
} catch (error) {
  console.error('Failed to initialize Prisma Client:', error);
  throw error;
}

module.exports = prisma;
