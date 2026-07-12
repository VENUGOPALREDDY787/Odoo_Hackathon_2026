const prisma = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { logActivity } = require('../../utils/logger');
const socket = require('../../utils/socket');

/**
 * Creates a new maintenance request (raised by Employee).
 */
async function createRequest(userId, orgId, { assetId, issueDescription, priority, photoUrl }) {
  // Validate Asset exists
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId, deletedAt: null }
  });
  if (!asset) {
    throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
  }

  // Prevent requests on retired/disposed assets
  if (['Retired', 'Disposed'].includes(asset.status)) {
    throw new AppError(`Cannot raise maintenance for a ${asset.status} asset.`, 400, 'ASSET_INACTIVE');
  }

  // Create Request
  const request = await prisma.maintenanceRequest.create({
    data: {
      organizationId: orgId,
      assetId,
      raisedBy: userId,
      issueDescription,
      priority,
      photoUrl: photoUrl || null,
      status: 'Pending',
      createdBy: userId
    },
    include: {
      asset: { select: { name: true, assetTag: true } },
      raiser: { select: { name: true, email: true } }
    }
  });

  // Log activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'RAISE_MAINTENANCE',
    entityType: 'MaintenanceRequest',
    entityId: request.id,
    details: { assetTag: asset.assetTag, priority }
  });

  // Notify Asset Managers
  const managers = await prisma.employee.findMany({
    where: { organizationId: orgId, role: 'Asset Manager', status: 'Active', deletedAt: null }
  });

  for (const mgr of managers) {
    const notif = await prisma.notification.create({
      data: {
        organizationId: orgId,
        recipientId: mgr.id,
        title: 'New Maintenance Request',
        message: `Maintenance requested for "${asset.name}" (${asset.assetTag}) by ${request.raiser.name}.`,
        type: 'Maintenance Approved', // General maintenance category
        relatedEntityType: 'MaintenanceRequest',
        relatedEntityId: request.id
      }
    });
    socket.emitToUser(mgr.id, 'notification', notif);
  }

  // Broadcast updates
  socket.emitToOrgRole(orgId, 'Asset Manager', 'maintenance_requested', request);
  socket.emitToOrg(orgId, 'kpi_update', { type: 'maintenance' });

  return request;
}

/**
 * Lists all maintenance requests with optional filtering.
 */
async function listRequests(orgId, query) {
  const status = query.status;
  const priority = query.priority;
  const assetId = query.assetId;

  const where = { organizationId: orgId };
  if (status) {
    where.status = status;
  }
  if (priority) {
    where.priority = priority;
  }
  if (assetId) {
    where.assetId = assetId;
  }

  return prisma.maintenanceRequest.findMany({
    where,
    include: {
      asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
      raiser: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Approves or Rejects a maintenance request (Asset Manager only).
 */
async function approveRequest(userId, orgId, requestId, { status }) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, organizationId: orgId, status: 'Pending' },
    include: { asset: true }
  });

  if (!request) {
    throw new AppError('Pending maintenance request not found.', 404, 'MAINTENANCE_NOT_FOUND');
  }

  return prisma.$transaction(async (tx) => {
    // If Approved, update asset state
    if (status === 'Approved') {
      const asset = request.asset;
      
      // Asset must be in Available or Allocated state
      if (!['Available', 'Allocated'].includes(asset.status)) {
        throw new AppError(`Cannot approve maintenance. Asset is currently in "${asset.status}" status.`, 400, 'INVALID_ASSET_STATUS');
      }

      // If Allocated, force return/de-allocate
      if (asset.status === 'Allocated') {
        await tx.allocation.updateMany({
          where: { assetId: asset.id, status: 'Active', actualReturnDate: null },
          data: {
            status: 'Returned',
            actualReturnDate: new Date(),
            returnCondition: 'Poor',
            returnNotes: `Force returned due to approved Maintenance Request: ${requestId}`
          }
        });
      }

      // Update Asset status to Under Maintenance
      await tx.asset.update({
        where: { id: asset.id },
        data: { status: 'Under Maintenance' }
      });
    }

    // Update Request status
    const updatedRequest = await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status,
        approvedBy: userId,
        approvedAt: status === 'Approved' ? new Date() : null,
        updatedBy: userId
      },
      include: {
        asset: { select: { name: true, assetTag: true } }
      }
    });

    // Log Activity
    await logActivity({
      organizationId: orgId,
      userId,
      action: status === 'Approved' ? 'APPROVE_MAINTENANCE' : 'REJECT_MAINTENANCE',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      details: { assetTag: request.asset.assetTag }
    });

    // Notify Raiser
    const notif = await tx.notification.create({
      data: {
        organizationId: orgId,
        recipientId: request.raisedBy,
        title: `Maintenance Request ${status}`,
        message: `Your maintenance request for "${request.asset.name}" (${request.asset.assetTag}) has been ${status.toLowerCase()} by the Asset Manager.`,
        type: 'Maintenance Approved',
        relatedEntityType: 'MaintenanceRequest',
        relatedEntityId: requestId
      }
    });
    socket.emitToUser(request.raisedBy, 'notification', notif);

    // Broadcast updates org-wide
    socket.emitToOrg(orgId, 'maintenance_updated', updatedRequest);
    socket.emitToOrg(orgId, 'kpi_update', { type: 'maintenance' });

    return updatedRequest;
  });
}

/**
 * Assigns a technician to approved maintenance.
 */
async function assignTechnician(userId, orgId, requestId, { assignedTechnician }) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, organizationId: orgId, status: { in: ['Approved', 'Technician Assigned'] } }
  });

  if (!request) {
    throw new AppError('Maintenance request is not in a state where a technician can be assigned.', 400, 'INVALID_MAINTENANCE_STATE');
  }

  const updatedRequest = await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: {
      status: 'Technician Assigned',
      assignedTechnician,
      updatedBy: userId
    },
    include: {
      asset: { select: { name: true, assetTag: true } }
    }
  });

  // Log Activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'ASSIGN_TECHNICIAN',
    entityType: 'MaintenanceRequest',
    entityId: requestId,
    details: { assetTag: request.asset.assetTag, technician: assignedTechnician }
  });

  // Notify Raiser
  const notif = await prisma.notification.create({
    data: {
      organizationId: orgId,
      recipientId: request.raisedBy,
      title: 'Technician Assigned',
      message: `Technician "${assignedTechnician}" has been assigned to repair your requested asset: "${request.asset.name}".`,
      type: 'Maintenance Approved',
      relatedEntityType: 'MaintenanceRequest',
      relatedEntityId: requestId
    }
  });
  socket.emitToUser(request.raisedBy, 'notification', notif);

  socket.emitToOrg(orgId, 'maintenance_updated', updatedRequest);

  return updatedRequest;
}

/**
 * Updates maintenance progress (In Progress -> Resolved).
 */
async function updateProgress(userId, orgId, requestId, { status, resolutionNotes }) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, organizationId: orgId, status: { in: ['Approved', 'Technician Assigned', 'In Progress'] } },
    include: { asset: true }
  });

  if (!request) {
    throw new AppError('Maintenance request is not in an active state.', 400, 'INVALID_MAINTENANCE_STATE');
  }

  return prisma.$transaction(async (tx) => {
    // If Resolved, update asset back to Available
    if (status === 'Resolved') {
      await tx.asset.update({
        where: { id: request.assetId },
        data: {
          status: 'Available',
          condition: 'Good' // Reverts to good condition on resolution
        }
      });
    }

    // Update Request
    const updatedRequest = await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status,
        resolvedAt: status === 'Resolved' ? new Date() : null,
        resolutionNotes: status === 'Resolved' ? resolutionNotes : null,
        updatedBy: userId
      },
      include: {
        asset: { select: { name: true, assetTag: true } }
      }
    });

    // Log Activity
    await logActivity({
      organizationId: orgId,
      userId,
      action: status === 'Resolved' ? 'RESOLVE_MAINTENANCE' : 'START_MAINTENANCE_WORK',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      details: { assetTag: request.asset.assetTag, notes: resolutionNotes }
    });

    // Notify Raiser
    const notif = await tx.notification.create({
      data: {
        organizationId: orgId,
        recipientId: request.raisedBy,
        title: status === 'Resolved' ? 'Maintenance Resolved' : 'Repair in Progress',
        message: status === 'Resolved'
          ? `The maintenance for "${request.asset.name}" (${request.asset.assetTag}) has been resolved. Note: ${resolutionNotes || 'None'}`
          : `Repair work has started on your requested asset: "${request.asset.name}".`,
        type: 'Maintenance Approved',
        relatedEntityType: 'MaintenanceRequest',
        relatedEntityId: requestId
      }
    });
    socket.emitToUser(request.raisedBy, 'notification', notif);

    // Broadcast updates
    socket.emitToOrg(orgId, 'maintenance_updated', updatedRequest);
    socket.emitToOrg(orgId, 'kpi_update', { type: 'maintenance' });

    return updatedRequest;
  });
}

module.exports = {
  createRequest,
  listRequests,
  approveRequest,
  assignTechnician,
  updateProgress
};
