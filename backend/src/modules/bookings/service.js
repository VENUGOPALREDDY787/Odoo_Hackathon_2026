const prisma = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { logActivity } = require('../../utils/logger');
const socket = require('../../utils/socket');

/**
 * Creates a new resource booking with time-overlap checking.
 */
async function createBooking(userId, orgId, userRole, { assetId, startTime, endTime, bookedOnBehalfOfDeptId, notes }) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  // Prevent past bookings
  if (start < now) {
    throw new AppError('Cannot create a booking in the past.', 400, 'INVALID_BOOKING_TIME');
  }

  // Validate Asset exists and is bookable
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId, deletedAt: null }
  });

  if (!asset) {
    throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
  }

  if (!asset.isShared) {
    throw new AppError(`Asset "${asset.name}" is not flagged as a shared/bookable resource.`, 400, 'RESOURCE_NOT_SHARED');
  }

  if (['Retired', 'Disposed', 'Lost'].includes(asset.status)) {
    throw new AppError(`Cannot book resource in "${asset.status}" condition.`, 400, 'RESOURCE_UNAVAILABLE');
  }

  // Enforce department booking permissions
  if (bookedOnBehalfOfDeptId) {
    if (userRole !== 'Admin' && userRole !== 'Asset Manager' && userRole !== 'Department Head') {
      throw new AppError('Only Department Heads or Managers can book resources on behalf of a department.', 403, 'FORBIDDEN');
    }
    // Verify department exists in the organization
    const dept = await prisma.department.findFirst({
      where: { id: bookedOnBehalfOfDeptId, organizationId: orgId }
    });
    if (!dept) {
      throw new AppError('Specified department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }
  }

  // Perform Locking & Overlap check inside Transaction
  return prisma.$transaction(async (tx) => {
    // Row-level lock on the asset record
    await tx.$queryRaw`SELECT id FROM assets WHERE id = ${assetId} FOR UPDATE`;

    // Overlap Query: checks if any existing active/upcoming/ongoing bookings cross the window
    const overlapCount = await tx.resourceBooking.count({
      where: {
        assetId,
        status: { in: ['Upcoming', 'Ongoing'] },
        startTime: { lt: end },
        endTime: { gt: start }
      }
    });

    if (overlapCount > 0) {
      throw new AppError('The requested time slot overlaps with an existing reservation.', 409, 'BOOKING_OVERLAP');
    }

    // Determine initial status based on start time
    const initialStatus = start <= now ? 'Ongoing' : 'Upcoming';

    // Create Booking
    const booking = await tx.resourceBooking.create({
      data: {
        organizationId: orgId,
        assetId,
        bookedBy: userId,
        bookedOnBehalfOfDeptId: bookedOnBehalfOfDeptId || null,
        startTime: start,
        endTime: end,
        status: initialStatus,
        notes: notes || null,
        createdBy: userId
      },
      include: {
        asset: { select: { name: true, assetTag: true } },
        booker: { select: { name: true, email: true } },
        department: { select: { name: true } }
      }
    });

    // Update asset status to Reserved if it was Available
    let assetStatusUpdate = asset.status;
    if (asset.status === 'Available') {
      assetStatusUpdate = 'Reserved';
      await tx.asset.update({
        where: { id: assetId },
        data: { status: 'Reserved' }
      });
    }

    // Log Activity
    await logActivity({
      organizationId: orgId,
      userId,
      action: 'CREATE_BOOKING',
      entityType: 'Booking',
      entityId: booking.id,
      details: { assetTag: asset.assetTag, startTime, endTime }
    });

    // Create confirmation notification
    const notif = await tx.notification.create({
      data: {
        organizationId: orgId,
        recipientId: userId,
        title: 'Booking Confirmed',
        message: `Your booking for "${asset.name}" (${startTime} to ${endTime}) is confirmed.`,
        type: 'Booking confirmed',
        relatedEntityType: 'Booking',
        relatedEntityId: booking.id
      }
    });
    socket.emitToUser(userId, 'notification', notif);

    // Broadcast booking creation org-wide to sync calendars immediately
    socket.emitToOrg(orgId, 'booking_created', booking);
    
    // Broadcast asset status updates if changed
    if (assetStatusUpdate !== asset.status) {
      socket.emitToOrg(orgId, 'asset_updated', { id: assetId, status: assetStatusUpdate });
    }

    socket.emitToOrg(orgId, 'kpi_update', { type: 'booking' });

    return booking;
  });
}

/**
 * List resource bookings.
 */
async function listBookings(orgId, query) {
  const assetId = query.assetId;
  const bookedBy = query.bookedBy;
  const status = query.status;

  const where = { organizationId: orgId };

  if (assetId) {
    where.assetId = assetId;
  }
  if (bookedBy) {
    where.bookedBy = bookedBy;
  }
  if (status) {
    where.status = status;
  }

  return prisma.resourceBooking.findMany({
    where,
    include: {
      asset: { select: { id: true, name: true, assetTag: true, isShared: true } },
      booker: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true } }
    },
    orderBy: { startTime: 'asc' }
  });
}

/**
 * Cancels an active or upcoming booking.
 */
async function cancelBooking(userId, orgId, userRole, bookingId) {
  const booking = await prisma.resourceBooking.findFirst({
    where: { id: bookingId, organizationId: orgId },
    include: { asset: true }
  });

  if (!booking) {
    throw new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND');
  }

  if (booking.status === 'Cancelled' || booking.status === 'Completed') {
    throw new AppError(`Cannot cancel a booking that is already "${booking.status}".`, 400, 'INVALID_BOOKING_ACTION');
  }

  // Auth check: only the booker, or Admin/Asset Manager can cancel
  if (booking.bookedBy !== userId && userRole !== 'Admin' && userRole !== 'Asset Manager') {
    throw new AppError('Forbidden. You do not have permission to cancel this booking.', 403, 'FORBIDDEN');
  }

  return prisma.$transaction(async (tx) => {
    // Update booking status
    const updatedBooking = await tx.resourceBooking.update({
      where: { id: bookingId },
      data: { status: 'Cancelled', updatedBy: userId },
      include: {
        asset: { select: { name: true, assetTag: true } }
      }
    });

    // Check if there are other active bookings (Upcoming / Ongoing) for the asset
    const activeCount = await tx.resourceBooking.count({
      where: {
        assetId: booking.assetId,
        status: { in: ['Ongoing', 'Upcoming'] }
      }
    });

    // Revert asset status back to Available if no other active bookings remain
    let assetStatusUpdate = booking.asset.status;
    if (activeCount === 0 && booking.asset.status === 'Reserved') {
      assetStatusUpdate = 'Available';
      await tx.asset.update({
        where: { id: booking.assetId },
        data: { status: 'Available' }
      });
    }

    // Log Activity
    await logActivity({
      organizationId: orgId,
      userId,
      action: 'CANCEL_BOOKING',
      entityType: 'Booking',
      entityId: bookingId,
      details: { assetTag: booking.asset.assetTag }
    });

    // Notify the booker (if cancelled by someone else)
    if (booking.bookedBy !== userId) {
      const notif = await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: booking.bookedBy,
          title: 'Booking Cancelled by Admin',
          message: `Your booking for "${booking.asset.name}" starting on ${booking.startTime.toLocaleString()} was cancelled.`,
          type: 'Booking confirmed', // General booking category
          relatedEntityType: 'Booking',
          relatedEntityId: bookingId
        }
      });
      socket.emitToUser(booking.bookedBy, 'notification', notif);
    }

    // Broadcast updates org-wide
    socket.emitToOrg(orgId, 'booking_updated', updatedBooking);
    
    if (assetStatusUpdate !== booking.asset.status) {
      socket.emitToOrg(orgId, 'asset_updated', { id: booking.assetId, status: assetStatusUpdate });
    }

    socket.emitToOrg(orgId, 'kpi_update', { type: 'booking' });

    return updatedBooking;
  });
}

module.exports = {
  createBooking,
  listBookings,
  cancelBooking
};
