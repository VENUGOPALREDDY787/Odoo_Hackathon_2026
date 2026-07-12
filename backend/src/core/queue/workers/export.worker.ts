import { Worker, Job } from 'bullmq';
import { bullmqConnection, QUEUE_NAMES } from '../queue.client';
import { ExportService } from '../../../modules/reports/service/export.service';
import redis from '../../redis/client';
import logger from '../../../config/logger';

/**
 * Export Worker
 *
 * Handles CPU-intensive PDF and Excel export generation off the main thread.
 * Report data is passed as part of the job payload (already fetched from DB).
 * The generated buffer is stored in Redis with a job-specific key for polling.
 *
 * Client flow:
 *  1. POST /api/reports/export → enqueue job → return { jobId }
 *  2. Client polls GET /api/jobs/:jobId/status
 *  3. On completion: GET /api/jobs/:jobId/download → retrieve from Redis
 *
 * Job Payload (ExportJobData):
 *  - jobId: string          — unique ID for Redis result key
 *  - format: 'pdf' | 'xlsx' | 'csv'
 *  - title: string
 *  - headers: string[]
 *  - rows: any[][]
 *  - filters: any
 *  - requestedBy: string    — email of requester (for PDF footer)
 */

export interface ExportJobData {
  jobId: string;
  format: 'pdf' | 'xlsx' | 'csv';
  title: string;
  headers: string[];
  rows: any[][];
  filters: any;
  requestedBy: string;
}

const EXPORT_RESULT_TTL = 3600; // Store result in Redis for 1 hour
const EXPORT_RESULT_PREFIX = 'export:result:';

let exportWorker: Worker | null = null;

export function startExportWorker(): Worker {
  const exportService = new ExportService();

  exportWorker = new Worker(
    QUEUE_NAMES.EXPORTS,
    async (job: Job<ExportJobData>) => {
      const { jobId, format, title, headers, rows, filters, requestedBy } = job.data;

      logger.info(`[ExportWorker] Processing export job ${jobId}: ${format} — "${title}" (${rows.length} rows)`);

      try {
        let buffer: Buffer;
        let contentType: string;
        let filename: string;
        const slug = title.toLowerCase().replace(/ /g, '_');

        if (format === 'pdf') {
          buffer = await exportService.generatePDF(title, headers, rows, filters, requestedBy);
          contentType = 'application/pdf';
          filename = `${slug}-${Date.now()}.pdf`;
        } else if (format === 'xlsx') {
          buffer = await exportService.generateExcel(title, headers, rows, filters, requestedBy);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          filename = `${slug}-${Date.now()}.xlsx`;
        } else {
          const csv = exportService.generateCSV(headers, rows);
          buffer = Buffer.from(csv, 'utf-8');
          contentType = 'text/csv';
          filename = `${slug}-${Date.now()}.csv`;
        }

        // Store result in Redis (base64 encoded)
        const resultKey = `${EXPORT_RESULT_PREFIX}${jobId}`;
        await redis.setex(resultKey, EXPORT_RESULT_TTL, JSON.stringify({
          buffer: buffer.toString('base64'),
          contentType,
          filename,
          completedAt: new Date().toISOString(),
        }));

        logger.info(`[ExportWorker] Export job ${jobId} complete — ${buffer.length} bytes stored.`);
        return { jobId, filename, size: buffer.length };

      } catch (err: any) {
        logger.error(`[ExportWorker] Export job ${jobId} failed: ${err.message}`);
        throw err;
      }
    },
    {
      connection: bullmqConnection,
      concurrency: 2, // Limit to 2 concurrent exports (CPU-intensive)
    }
  );

  exportWorker.on('failed', (job, err) => {
    logger.error(`[ExportWorker] Job ${job?.id} failed: ${err.message}`);
  });

  exportWorker.on('error', (err) => {
    logger.error('[ExportWorker] Worker error:', err.message);
  });

  logger.info('[BullMQ] Export worker started (concurrency=2).');
  return exportWorker;
}

/**
 * Retrieves an export result from Redis by job ID.
 * Returns null if the result has expired or doesn't exist.
 */
export async function getExportResult(jobId: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
  completedAt: string;
} | null> {
  try {
    const data = await redis.get(`${EXPORT_RESULT_PREFIX}${jobId}`);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return {
      buffer: Buffer.from(parsed.buffer, 'base64'),
      contentType: parsed.contentType,
      filename: parsed.filename,
      completedAt: parsed.completedAt,
    };
  } catch {
    return null;
  }
}

export async function stopExportWorker(): Promise<void> {
  if (exportWorker) {
    await exportWorker.close();
    logger.info('[BullMQ] Export worker stopped.');
  }
}
