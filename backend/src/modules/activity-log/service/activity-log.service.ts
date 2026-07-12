import { ActivityLogRepository } from '../repository/activity-log.repository';
import { CreateActivityLogDTO, ActivityLogQueryDTO } from '../dto/activity-log.dto';
import { Prisma } from '@prisma/client';
import { AppError } from '../../../core/errors/AppError';
import { emitToOrg } from '../../../utils/socket';

/**
 * ActivityLogService — Core business logic for immutable activity logging and auditing.
 *
 * All operations are strictly read-only, except create (logging footprints).
 * No updates or deletes are allowed to preserve audit integrity.
 */
export class ActivityLogService {
  private repository: ActivityLogRepository;

  constructor(repository = new ActivityLogRepository()) {
    this.repository = repository;
  }

  /**
   * Records a user footprint.
   * Emits socket event on creation.
   */
  async log(orgId: string, dto: CreateActivityLogDTO, tx?: Prisma.TransactionClient) {
    const logEntry = await this.repository.create(orgId, dto, tx);
    
    // Real-time broadcast (non-blocking)
    try {
      emitToOrg(orgId, 'activity.created', {
        id: logEntry.id,
        action: logEntry.action,
        module: logEntry.module,
        userName: logEntry.user?.name || 'System'
      });
    } catch { /* non-fatal socket emit fail */ }

    return logEntry;
  }

  /**
   * Retrieves single activity footprint.
   */
  async getLog(orgId: string, id: string) {
    const logEntry = await this.repository.findById(id, orgId);
    if (!logEntry) throw new AppError('Activity log entry not found.', 404, 'LOG_NOT_FOUND');
    return logEntry;
  }

  /**
   * Lists logs matching dynamic query filters with offset pagination.
   */
  async listLogs(orgId: string, query: ActivityLogQueryDTO) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const filters: Prisma.ActivityLogWhereInput = {};

    // Exact matches
    if (query.userId) filters.userId = query.userId;
    if (query.action) filters.action = query.action;
    if (query.module) filters.module = query.module;
    if (query.entityType) filters.entityType = query.entityType;
    if (query.entityId) filters.entityId = query.entityId;

    // Date range
    if (query.startDate || query.endDate) {
      filters.createdAt = {};
      if (query.startDate) {
        filters.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        // Include full day
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filters.createdAt.lte = end;
      }
    }

    // Text search (matches action, module, browser, ip, or recipient name)
    if (query.search) {
      const searchStr = query.search;
      filters.OR = [
        { action: { contains: searchStr } },
        { module: { contains: searchStr } },
        { entityType: { contains: searchStr } },
        { ipAddress: { contains: searchStr } },
        { browser: { contains: searchStr } },
        { user: { name: { contains: searchStr } } }
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.ActivityLogOrderByWithRelationInput = { [sortBy]: sortOrder };

    const [total, logs] = await Promise.all([
      this.repository.count(orgId, filters),
      this.repository.findMany(orgId, filters, skip, limit, orderBy)
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Generates a CSV stream/string of activity logs.
   */
  async exportLogs(orgId: string, query: ActivityLogQueryDTO): Promise<string> {
    // Override page limit to retrieve full set for export (capped at 5000 records)
    const exportQuery = { ...query, page: 1, limit: 5000 };
    const result = await this.listLogs(orgId, exportQuery);

    const headers = [
      'Timestamp',
      'Action',
      'Module',
      'Entity Type',
      'Entity ID',
      'User Name',
      'User Email',
      'IP Address',
      'Browser',
      'Device',
      'Request ID'
    ];

    const rows = result.logs.map((log) => [
      log.createdAt.toISOString(),
      log.action,
      log.module || 'N/A',
      log.entityType,
      log.entityId || 'N/A',
      log.user?.name || 'System',
      log.user?.email || 'N/A',
      log.ipAddress || 'N/A',
      log.browser || 'N/A',
      log.device || 'N/A',
      log.requestId || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

export default ActivityLogService;
