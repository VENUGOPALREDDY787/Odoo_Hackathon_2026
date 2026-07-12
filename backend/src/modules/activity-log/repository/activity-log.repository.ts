import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';
import { CreateActivityLogDTO } from '../dto/activity-log.dto';

/**
 * ActivityLogRepository — Pure data-access layer for immutable ActivityLog records.
 *
 * Responsibilities:
 *  - Writes to the activity_logs table
 *  - Retrieves activity history with dynamic filters, text search, and pagination
 *  - Optimized joins for Employee and Department (avoids N+1)
 *
 * Activity logs are strictly read-only and immutable. No update/delete operations allowed.
 */
export class ActivityLogRepository {

  private readonly defaultInclude = {
    user: { select: { id: true, name: true, email: true, role: true } },
    department: { select: { id: true, name: true } }
  };

  /**
   * Appends an immutable log entry. Supports transactional context.
   */
  async create(orgId: string, data: CreateActivityLogDTO, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.activityLog.create({
      data: {
        organization: { connect: { id: orgId } },
        action: data.action,
        module: data.module,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        oldValue: data.oldValue ? (data.oldValue as any) : Prisma.JsonNull,
        newValue: data.newValue ? (data.newValue as any) : Prisma.JsonNull,
        user: data.userId ? { connect: { id: data.userId } } : undefined,
        department: data.departmentId ? { connect: { id: data.departmentId } } : undefined,
        ipAddress: data.ipAddress ?? null,
        browser: data.browser ?? null,
        device: data.device ?? null,
        requestId: data.requestId ?? null
      },
      include: this.defaultInclude
    });
  }

  /**
   * Retrieves a single activity log entry by ID.
   */
  async findById(id: string, orgId: string) {
    return prisma.activityLog.findFirst({
      where: { id, organizationId: orgId },
      include: this.defaultInclude
    });
  }

  /**
   * Lists logs matching dynamic filters with offset pagination and ordering.
   */
  async findMany(
    orgId: string,
    filters: Prisma.ActivityLogWhereInput = {},
    skip = 0,
    take = 20,
    orderBy: Prisma.ActivityLogOrderByWithRelationInput = { createdAt: 'desc' }
  ) {
    return prisma.activityLog.findMany({
      where: { organizationId: orgId, ...filters },
      include: this.defaultInclude,
      skip,
      take,
      orderBy
    });
  }

  /**
   * Returns count matching dynamic filters for pagination metadata.
   */
  async count(orgId: string, filters: Prisma.ActivityLogWhereInput = {}): Promise<number> {
    return prisma.activityLog.count({
      where: { organizationId: orgId, ...filters }
    });
  }

  /**
   * Fetches activity logs matching an entity ID directly.
   */
  async findByEntity(orgId: string, entityType: string, entityId: string) {
    return prisma.activityLog.findMany({
      where: { organizationId: orgId, entityType, entityId },
      include: this.defaultInclude,
      orderBy: { createdAt: 'desc' }
    });
  }
}

export default ActivityLogRepository;
