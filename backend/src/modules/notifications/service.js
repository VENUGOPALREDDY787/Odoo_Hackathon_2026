const prisma = require('../../config/db');
const { AppError } = require('../../utils/errors');

/**
 * Lists notifications for a specific employee.
 */
async function listNotifications(userId, orgId, query) {
  const isReadFilter = query.isRead;
  const where = {
    recipientId: userId,
    organizationId: orgId
  };

  if (isReadFilter !== undefined) {
    where.isRead = isReadFilter === 'true' || isReadFilter === true;
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Marks a single notification as read.
 */
async function markAsRead(userId, notifId) {
  const notif = await prisma.notification.findUnique({
    where: { id: notifId }
  });

  if (!notif || notif.recipientId !== userId) {
    throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
  }

  return prisma.notification.update({
    where: { id: notifId },
    data: { isRead: true }
  });
}

/**
 * Marks all notifications for a user as read.
 */
async function markAllAsRead(userId, orgId) {
  return prisma.notification.updateMany({
    where: { recipientId: userId, organizationId: orgId, isRead: false },
    data: { isRead: true }
  });
}

/**
 * Lists organizational activity logs (Admin & Asset Manager only).
 */
async function listActivityLogs(orgId, query) {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const search = query.search || '';
  const entityType = query.entityType;

  const where = { organizationId: orgId };

  if (entityType) {
    where.entityType = entityType;
  }

  if (search) {
    where.OR = [
      { action: { contains: search } },
      { user: { name: { contains: search } } }
    ];
  }

  const total = await prisma.activityLog.count({ where });
  const logs = await prisma.activityLog.findMany({
    where,
    skip,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

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

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
  listActivityLogs
};
