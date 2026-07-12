const prisma = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { logActivity } = require('../../utils/logger');
const socket = require('../../utils/socket');

/**
 * Assigns an asset to an employee or department.
 */
async function allocateAsset(userId, orgId, { assetId, allocatedToType, employeeId, departmentId, expectedReturnDate }) {
  // Validate Asset exists
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId, deletedAt: null }
  });
  if (!asset) {
    throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
  }

  // Conflict Check & Transaction
  return prisma.$transaction(async (tx) => {
    // Lock the asset record to prevent race conditions
    const lockedAsset = await tx.$queryRaw`SELECT id, status, name, asset_tag FROM assets WHERE id = ${assetId} FOR UPDATE`;
    const currentAsset = lockedAsset[0];
    
    if (!currentAsset) {
      throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
    }

    // Check if asset is already allocated
    if (currentAsset.status !== 'Available') {
      const activeAlloc = await tx.allocation.findFirst({
        where: { assetId, status: 'Active', actualReturnDate: null, deletedAt: null },
        include: {
          employee: { select: { name: true } },
          department: { select: { name: true } }
        }
      });

      const holderName = activeAlloc
        ? (activeAlloc.employee ? activeAlloc.employee.name : activeAlloc.department?.name)
        : 'another user';

      throw new AppError(
        `Asset "${currentAsset.name}" (${currentAsset.asset_tag}) is currently held by ${holderName}.`,
        409,
        'ALLOCATION_CONFLICT',
        { holderName, assetId }
      );
    }

    // Create Allocation record
    const allocation = await tx.allocation.create({
      data: {
        organizationId: orgId,
        assetId,
        allocatedToType,
        employeeId: allocatedToType === 'Employee' ? employeeId : null,
        departmentId: allocatedToType === 'Department' ? departmentId : null,
        allocatedBy: userId,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
        status: 'Active'
      },
      include: {
        employee: { select: { name: true, email: true } },
        department: { select: { name: true } }
      }
    });

    // Update Asset status to Allocated
    const updatedAsset = await tx.asset.update({
      where: { id: assetId },
      data: { status: 'Allocated' }
    });

    // Log allocation activity
    await logActivity({
      organizationId: orgId,
      userId,
      action: 'ALLOCATE_ASSET',
      entityType: 'Asset',
      entityId: assetId,
      details: {
        assetTag: currentAsset.asset_tag,
        allocatedTo: allocatedToType,
        holderName: allocatedToType === 'Employee' ? allocation.employee?.name : allocation.department?.name
      }
    });

    // Notify employee (if allocated to an employee)
    if (allocatedToType === 'Employee' && employeeId) {
      const notif = await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: employeeId,
          title: 'Asset Allocated to You',
          message: `The asset "${currentAsset.name}" (${currentAsset.asset_tag}) has been allocated to you. Expected return date: ${expectedReturnDate ? new Date(expectedReturnDate).toLocaleDateString() : 'N/A'}.`,
          type: 'Asset Assigned',
          relatedEntityType: 'Allocation',
          relatedEntityId: allocation.id
        }
      });
      socket.emitToUser(employeeId, 'notification', notif);
    }

    // Broadcast update and refresh KPI
    socket.emitToOrg(orgId, 'asset_updated', updatedAsset);
    socket.emitToOrg(orgId, 'kpi_update', { type: 'allocation' });

    return allocation;
  });
}

/**
 * Returns an allocated asset and makes it Available.
 */
async function returnAsset(userId, orgId, allocationId, { returnCondition, returnNotes }) {
  const allocation = await prisma.allocation.findFirst({
    where: { id: allocationId, organizationId: orgId, status: 'Active', deletedAt: null },
    include: { asset: true }
  });

  if (!allocation) {
    throw new AppError('Active allocation not found.', 404, 'ALLOCATION_NOT_FOUND');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update Allocation
    const updatedAlloc = await tx.allocation.update({
      where: { id: allocationId },
      data: {
        actualReturnDate: new Date(),
        status: 'Returned',
        returnCondition: returnCondition || allocation.asset.condition,
        returnNotes: returnNotes || null,
        updatedBy: userId
      }
    });

    // 2. Update Asset status to Available and update condition
    const updatedAsset = await tx.asset.update({
      where: { id: allocation.assetId },
      data: {
        status: 'Available',
        condition: returnCondition || allocation.asset.condition
      }
    });

    // Log return activity
    await logActivity({
      organizationId: orgId,
      userId,
      action: 'RETURN_ASSET',
      entityType: 'Asset',
      entityId: allocation.assetId,
      details: {
        assetTag: allocation.asset.assetTag,
        condition: returnCondition,
        notes: returnNotes
      }
    });

    // Notify employee (if it was an employee allocation)
    if (allocation.employeeId) {
      const notif = await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: allocation.employeeId,
          title: 'Asset Return Processed',
          message: `The return of "${allocation.asset.name}" (${allocation.asset.assetTag}) has been successfully processed.`,
          type: 'Asset Assigned', // General category
          relatedEntityType: 'Allocation',
          relatedEntityId: allocationId
        }
      });
      socket.emitToUser(allocation.employeeId, 'notification', notif);
    }

    // Broadcast updates
    socket.emitToOrg(orgId, 'asset_updated', updatedAsset);
    socket.emitToOrg(orgId, 'kpi_update', { type: 'allocation' });

    return updatedAlloc;
  });
}

/**
 * Creates a Transfer Request for an asset that is currently taken.
 */
async function requestTransfer(userId, orgId, { assetId, toEmployeeId, toDepartmentId, requestNotes }) {
  // Find current active allocation
  const activeAlloc = await prisma.allocation.findFirst({
    where: { assetId, status: 'Active', actualReturnDate: null, deletedAt: null },
    include: { asset: true }
  });

  if (!activeAlloc) {
    throw new AppError('This asset is not currently allocated. You can allocate it directly.', 400, 'DIRECT_ALLOCATION_AVAILABLE');
  }

  // Prevent transferring to self
  if (toEmployeeId && activeAlloc.employeeId === toEmployeeId) {
    throw new AppError('Target holder is already the current holder.', 400, 'TRANSFER_REDUNDANT');
  }

  // Create Transfer Request
  const transfer = await prisma.transfer.create({
    data: {
      organizationId: orgId,
      assetId,
      fromEmployeeId: activeAlloc.employeeId,
      fromDepartmentId: activeAlloc.departmentId,
      toEmployeeId: toEmployeeId || null,
      toDepartmentId: toDepartmentId || null,
      requestedBy: userId,
      status: 'Pending',
      requestNotes: requestNotes || null
    },
    include: {
      asset: { select: { name: true, assetTag: true } },
      requester: { select: { name: true } },
      toEmployee: { select: { name: true } },
      toDepartment: { select: { name: true } }
    }
  });

  // Log activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'REQUEST_TRANSFER',
    entityType: 'Transfer',
    entityId: transfer.id,
    details: { assetTag: transfer.asset.assetTag, from: activeAlloc.employeeId || activeAlloc.departmentId }
  });

  // Notify current holder (if employee)
  if (activeAlloc.employeeId) {
    const notif = await prisma.notification.create({
      data: {
        organizationId: orgId,
        recipientId: activeAlloc.employeeId,
        title: 'Transfer Requested for Your Asset',
        message: `A transfer request has been raised for the asset "${transfer.asset.name}" (${transfer.asset.assetTag}) currently held by you.`,
        type: 'Transfer Approved', // General category
        relatedEntityType: 'Transfer',
        relatedEntityId: transfer.id
      }
    });
    socket.emitToUser(activeAlloc.employeeId, 'notification', notif);
  }

  // Notify Asset Managers
  const managers = await prisma.employee.findMany({
    where: { organizationId: orgId, role: 'Asset Manager', status: 'Active', deletedAt: null }
  });
  for (const mgr of managers) {
    const notif = await prisma.notification.create({
      data: {
        organizationId: orgId,
        recipientId: mgr.id,
        title: 'New Transfer Request',
        message: `A transfer request for "${transfer.asset.name}" has been raised by ${transfer.requester.name}.`,
        type: 'Transfer Approved',
        relatedEntityType: 'Transfer',
        relatedEntityId: transfer.id
      }
    });
    socket.emitToUser(mgr.id, 'notification', notif);
  }

  // Broadcast Socket.io transfer updates
  socket.emitToOrgRole(orgId, 'Asset Manager', 'transfer_requested', transfer);

  return transfer;
}

/**
 * List transfer requests inside the organization.
 */
async function listTransfers(orgId, query) {
  const status = query.status;
  const where = { organizationId: orgId };
  if (status) {
    where.status = status;
  }

  return prisma.transfer.findMany({
    where,
    include: {
      asset: { select: { id: true, name: true, assetTag: true } },
      fromEmployee: { select: { id: true, name: true } },
      fromDepartment: { select: { id: true, name: true } },
      toEmployee: { select: { id: true, name: true } },
      toDepartment: { select: { id: true, name: true } },
      requester: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Approves or Rejects a Transfer request (Asset Manager / Department Head only).
 */
async function processTransfer(userId, orgId, userRole, transferId, { status, approvalNotes }) {
  const transfer = await prisma.transfer.findFirst({
    where: { id: transferId, organizationId: orgId, status: 'Pending' },
    include: {
      asset: true,
      requester: true
    }
  });

  if (!transfer) {
    throw new AppError('Pending transfer request not found.', 404, 'TRANSFER_NOT_FOUND');
  }

  // Validate authorization (Asset Manager can approve any; Department Head can approve if transferring from/to their department)
  if (userRole !== 'Admin' && userRole !== 'Asset Manager') {
    if (userRole === 'Department Head') {
      const deptHead = await prisma.employee.findUnique({
        where: { id: userId },
        include: { managedDepts: true }
      });
      const managedDeptIds = deptHead.managedDepts.map(d => d.id);
      
      const involvedInDept = (transfer.fromDepartmentId && managedDeptIds.includes(transfer.fromDepartmentId)) ||
                             (transfer.toDepartmentId && managedDeptIds.includes(transfer.toDepartmentId));
      
      if (!involvedInDept) {
        throw new AppError('Forbidden. You can only approve transfers involving your department.', 403, 'FORBIDDEN');
      }
    } else {
      throw new AppError('Forbidden. Insufficient permissions to process transfers.', 403, 'FORBIDDEN');
    }
  }

  return prisma.$transaction(async (tx) => {
    if (status === 'Rejected') {
      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'Rejected',
          approvedBy: userId,
          approvalNotes: approvalNotes || null
        }
      });

      // Notify Requester
      const notif = await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: transfer.requestedBy,
          title: 'Transfer Request Rejected',
          message: `Your transfer request for "${transfer.asset.name}" (${transfer.asset.assetTag}) was rejected. Notes: ${approvalNotes || 'None'}`,
          type: 'Transfer Approved', // general category
          relatedEntityType: 'Transfer',
          relatedEntityId: transferId
        }
      });
      socket.emitToUser(transfer.requestedBy, 'notification', notif);

      return updatedTransfer;
    }

    // Status is 'Approved' -> Re-allocate
    // 1. Find active allocation
    const activeAlloc = await tx.allocation.findFirst({
      where: { assetId: transfer.assetId, status: 'Active', actualReturnDate: null, deletedAt: null }
    });

    if (activeAlloc) {
      // 2. Close active allocation
      await tx.allocation.update({
        where: { id: activeAlloc.id },
        data: {
          actualReturnDate: new Date(),
          status: 'Returned',
          returnCondition: transfer.asset.condition,
          returnNotes: `Transferred via Transfer Request ${transferId}`
        }
      });
    }

    // 3. Create new allocation
    const newAlloc = await tx.allocation.create({
      data: {
        organizationId: orgId,
        assetId: transfer.assetId,
        allocatedToType: transfer.toEmployeeId ? 'Employee' : 'Department',
        employeeId: transfer.toEmployeeId,
        departmentId: transfer.toDepartmentId,
        allocatedBy: userId,
        status: 'Active'
      }
    });

    // 4. Update Transfer request
    const updatedTransfer = await tx.transfer.update({
      where: { id: transferId },
      data: {
        status: 'Approved',
        approvedBy: userId,
        approvalNotes: approvalNotes || null
      }
    });

    // Log activity
    await logActivity({
      organizationId: orgId,
      userId,
      action: 'APPROVE_TRANSFER',
      entityType: 'Transfer',
      entityId: transferId,
      details: { assetTag: transfer.asset.assetTag, newHolder: transfer.toEmployeeId || transfer.toDepartmentId }
    });

    // Notify requester
    const reqNotif = await tx.notification.create({
      data: {
        organizationId: orgId,
        recipientId: transfer.requestedBy,
        title: 'Transfer Request Approved',
        message: `Your transfer request for "${transfer.asset.name}" has been approved! The asset is now allocated to the target.`,
        type: 'Transfer Approved',
        relatedEntityType: 'Transfer',
        relatedEntityId: transferId
      }
    });
    socket.emitToUser(transfer.requestedBy, 'notification', reqNotif);

    // Notify new holder (if employee)
    if (transfer.toEmployeeId) {
      const holderNotif = await tx.notification.create({
        data: {
          organizationId: orgId,
          recipientId: transfer.toEmployeeId,
          title: 'Asset Transferred to You',
          message: `The asset "${transfer.asset.name}" (${transfer.asset.assetTag}) has been transferred to you.`,
          type: 'Asset Assigned',
          relatedEntityType: 'Allocation',
          relatedEntityId: newAlloc.id
        }
      });
      socket.emitToUser(transfer.toEmployeeId, 'notification', holderNotif);
    }

    // Broadcast Socket.io state
    socket.emitToOrg(orgId, 'kpi_update', { type: 'allocation' });

    return updatedTransfer;
  });
}

module.exports = {
  allocateAsset,
  returnAsset,
  requestTransfer,
  listTransfers,
  processTransfer
};
