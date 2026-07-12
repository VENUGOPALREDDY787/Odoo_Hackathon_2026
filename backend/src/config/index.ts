import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const parseNumeric = (defaultVal: number) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const parsed = parseInt(val as string, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, z.number().default(defaultVal));

const envSchema = z.object({
  PORT: parseNumeric(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: parseNumeric(6379),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters long'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET must be at least 10 characters long'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const parsed = parseInt(val as string, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, z.number().optional()).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default('noreply@assetflow.com'),
  CLIENT_URL: z.string().default('*')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
export default config;
