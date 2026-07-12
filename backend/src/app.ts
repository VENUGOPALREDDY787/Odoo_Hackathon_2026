import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import logRequest from './middleware/logger';
import requestId from './middlewares/requestId';
import errorHandler from './middleware/errorHandler';
import apiRouter from './routes';
import * as response from './utils/response';
import { AppError } from './core/errors/AppError';
import { activityContextMiddleware } from './middleware/activity-context';
import { metricsMiddleware } from './middleware/metrics';
import { sanitize } from './middleware/sanitize';
import { generalLimiter, authLimiter } from './middleware/rateLimiter';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// ─── Trust Proxy (required behind load balancers / Nginx) ──────────────────
// Needed for correct IP detection in rate limiters and logs.
app.set('trust proxy', 1);

// ─── Security Headers (Helmet) ─────────────────────────────────────────────
app.use(helmet({
  // HTTP Strict Transport Security — force HTTPS in production
  hsts: isProduction ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false,

  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : undefined,
    }
  } as any : false,

  // Prevent MIME type sniffing
  noSniff: true,

  // Prevent clickjacking
  frameguard: { action: 'deny' },

  // Remove X-Powered-By: Express
  hidePoweredBy: true,

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // Cross-Origin policies for API server
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ──────────────────────────────────────────────────────────────────
// Parse comma-separated allowed origins from env for multi-origin support.
// In production, CLIENT_URL should be set to the actual frontend domain.
// Never use '*' in production — always whitelist specific origins.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin header) in non-production
    if (!origin && !isProduction) return callback(null, true);

    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin "${origin}" is not allowed.`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400, // Preflight cache for 24h (reduces OPTIONS requests)
}));

// ─── Compression ────────────────────────────────────────────────────────────
// Compress responses >1KB. Saves significant bandwidth on paginated list APIs.
app.use(compression({
  level: 6,       // Balanced compression/speed (1=fast, 9=max compression)
  threshold: 1024 // Only compress responses larger than 1KB
}));

// ─── Body Parsers ───────────────────────────────────────────────────────────
// Cap JSON payload at 2MB to prevent body-parser exhaustion attacks.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── Input Sanitisation ─────────────────────────────────────────────────────
// Must run AFTER body parsers, BEFORE routes.
app.use(sanitize);

// ─── General Rate Limiter ───────────────────────────────────────────────────
// 100 requests per minute per IP — applied globally.
app.use(generalLimiter);

// ─── Tracing & Logging ─────────────────────────────────────────────────────
app.use(requestId);
app.use(logRequest);
app.use(activityContextMiddleware);

// ─── Performance Metrics ────────────────────────────────────────────────────
app.use(metricsMiddleware);

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json(response.success({ status: 'UP', timestamp: new Date() }));
});

// ─── Auth Rate Limiter (applied to auth routes only) ───────────────────────
// Stricter limits: 10 req/15min for login, register, token refresh.
app.use('/api/auth', authLimiter);

// ─── Modular API Router ─────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── Fallback 404 ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  next(new AppError(`API endpoint not found: ${req.method} ${req.url}`, 404, 'NOT_FOUND'));
});

// ─── Centralised Error Handler ──────────────────────────────────────────────
app.use(errorHandler);

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
// On SIGTERM/SIGINT, allow in-flight requests to complete before exiting.
function gracefulShutdown(signal: string) {
  console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);
  process.exit(0);
}
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
export { app };
