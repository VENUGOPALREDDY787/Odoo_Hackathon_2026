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

const app = express();

// Security and Compression middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trace ID and HTTP Request logs
app.use(requestId);
app.use(logRequest);
app.use(activityContextMiddleware);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json(response.success({ status: 'UP', timestamp: new Date() }));
});

// Mount modular API router
app.use('/api', apiRouter);

// Fallback for unmatched routes
app.use((req, _res, next) => {
  next(new AppError(`API endpoint not found: ${req.method} ${req.url}`, 404, 'NOT_FOUND'));
});

// Centralized error handler
app.use(errorHandler);

export default app;
export { app };
