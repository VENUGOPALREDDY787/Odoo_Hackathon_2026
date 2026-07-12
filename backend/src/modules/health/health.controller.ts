import { Request, Response } from 'express';
import prisma from '../../database/db';
import { cache } from '../../core/cache/cache.service';

/**
 * HealthController — Production health and readiness endpoints.
 *
 * Endpoints:
 *  GET /health          → Basic liveness probe (returns 200 if process is alive)
 *  GET /health/detailed → Deep health check (DB + Redis + memory + uptime)
 *  GET /health/ready    → Kubernetes readiness probe (DB + Redis must be UP)
 */
export class HealthController {

  /**
   * Basic liveness probe.
   * Returns 200 immediately if the Express process is running.
   * Used by: Docker HEALTHCHECK, load balancer health check.
   */
  liveness = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    });
  };

  /**
   * Kubernetes readiness probe.
   * Returns 200 only when DB + Redis are both reachable.
   * Used by: K8s readiness probe — pod only receives traffic when ready.
   */
  readiness = async (_req: Request, res: Response): Promise<void> => {
    const [dbOk, redisOk] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const ready = dbOk && redisOk;

    res.status(ready ? 200 : 503).json({
      status: ready ? 'READY' : 'NOT_READY',
      services: {
        database: dbOk ? 'UP' : 'DOWN',
        redis: redisOk ? 'UP' : 'DOWN',
      },
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Deep health check — returns diagnostics for all services.
   * Used by: Ops dashboards, DevOps monitoring.
   */
  detailed = async (_req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    const [dbLatency, redisLatency] = await Promise.all([
      this.checkDatabaseLatency(),
      cache.ping(),
    ]);

    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const report = {
      status: dbLatency >= 0 && redisLatency >= 0 ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.round(uptime),
        human: this.formatUptime(uptime),
      },
      services: {
        database: {
          status: dbLatency >= 0 ? 'UP' : 'DOWN',
          latencyMs: dbLatency,
        },
        redis: {
          status: redisLatency >= 0 ? 'UP' : 'DOWN',
          latencyMs: redisLatency,
        },
      },
      memory: {
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
        externalMB: Math.round(memoryUsage.external / 1024 / 1024),
        heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
      node: {
        version: process.version,
        env: process.env.NODE_ENV || 'development',
        pid: process.pid,
      },
      diagnosticMs: Date.now() - startTime,
    };

    const statusCode = report.status === 'UP' ? 200 : 207;
    res.status(statusCode).json(report);
  };

  // ─── Private Helpers ────────────────────────────────────────────────────

  private async checkDatabase(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkDatabaseLatency(): Promise<number> {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      return Date.now() - start;
    } catch {
      return -1;
    }
  }

  private async checkRedis(): Promise<boolean> {
    return (await cache.ping()) >= 0;
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    return parts.join(' ');
  }
}

export default HealthController;
