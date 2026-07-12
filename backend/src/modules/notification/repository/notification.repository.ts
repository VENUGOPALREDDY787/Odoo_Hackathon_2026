import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';
import { CreateNotificationDTO, UpdatePreferencesDTO } from '../dto/notification.dto';

/**
 * NotificationRepository — Pure data access layer for notifications, templates, and preferences.
 *
 * Excludes soft-deleted records (deletedAt: null) by default.
 */
export class NotificationRepository {

  // ─── Notifications ─────────────────────────────────────────────────────────

  async create(orgId: string, data: CreateNotificationDTO, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.notification.create({
      data: {
        organization: { connect: { id: orgId } },
        recipient: { connect: { id: data.recipientId } },
        title: data.title,
        message: data.message,
        type: data.type,
        relatedEntityType: data.relatedEntityType ?? null,
        relatedEntityId: data.relatedEntityId ?? null,
        status: 'Unread'
      }
    });
  }

  async findById(id: string, orgId: string) {
    return prisma.notification.findFirst({
      where: { id, organizationId: orgId, deletedAt: null }
    });
  }

  async findMany(
    orgId: string,
    recipientId: string,
    filters: Prisma.NotificationWhereInput = {},
    skip = 0,
    take = 20
  ) {
    return prisma.notification.findMany({
      where: {
        organizationId: orgId,
        recipientId,
        deletedAt: null,
        ...filters
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
  }

  async count(orgId: string, recipientId: string, filters: Prisma.NotificationWhereInput = {}): Promise<number> {
    return prisma.notification.count({
      where: {
        organizationId: orgId,
        recipientId,
        deletedAt: null,
        ...filters
      }
    });
  }

  async countUnread(orgId: string, recipientId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        organizationId: orgId,
        recipientId,
        status: 'Unread',
        deletedAt: null
      }
    });
  }

  async updateStatusBulk(
    orgId: string,
    recipientId: string,
    ids: string[],
    status: 'Read' | 'Archived',
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.notification.updateMany({
      where: {
        id: { in: ids },
        organizationId: orgId,
        recipientId,
        deletedAt: null
      },
      data: { status }
    });
  }

  async markAllRead(orgId: string, recipientId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.notification.updateMany({
      where: {
        organizationId: orgId,
        recipientId,
        status: 'Unread',
        deletedAt: null
      },
      data: { status: 'Read' }
    });
  }

  async softDeleteBulk(orgId: string, recipientId: string, ids: string[], tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.notification.updateMany({
      where: {
        id: { in: ids },
        organizationId: orgId,
        recipientId,
        deletedAt: null
      },
      data: { deletedAt: new Date() }
    });
  }

  // ─── Preferences ───────────────────────────────────────────────────────────

  async findPreferences(employeeId: string) {
    return prisma.notificationPreference.findMany({
      where: { employeeId }
    });
  }

  async updatePreferences(
    orgId: string,
    employeeId: string,
    dto: UpdatePreferencesDTO,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;

    const operations = dto.preferences.map((p) =>
      client.notificationPreference.upsert({
        where: { employeeId_type: { employeeId, type: p.type } },
        create: {
          organizationId: orgId,
          employeeId,
          type: p.type,
          emailEnabled: p.emailEnabled,
          inAppEnabled: p.inAppEnabled,
          pushEnabled: p.pushEnabled
        },
        update: {
          emailEnabled: p.emailEnabled,
          inAppEnabled: p.inAppEnabled,
          pushEnabled: p.pushEnabled
        }
      })
    );

    return Promise.all(operations);
  }

  // ─── Templates ─────────────────────────────────────────────────────────────

  async findTemplate(orgId: string, type: string) {
    return prisma.notificationTemplate.findUnique({
      where: { organizationId_type: { organizationId: orgId, type } }
    });
  }
}

export default NotificationRepository;
