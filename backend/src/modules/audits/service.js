const prisma = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { logActivity } = require('../../utils/logger');
const socket = require('../../utils/socket');

/**
 * Creates an Audit Cycle in Draft status and populates its scoping items.
 */
async function createCycle(userId, orgId, { name, scopeType, scopeDepartmentId, scopeLocation, startDate, endDate, auditorIds }) {
  // Verify auditors exist in same organization
  const employees = await prisma.employee.findMany({
    where: { id: { in: auditorIds }, organizationId: orgId, status: 'Active', deletedAt: null }
  });
  if (employees.length !== auditorIds.length) {
    throw new AppError('One or more selected auditors do not exist or are inactive.', 400, 'INVALID_AUDITORS');
  }

  // Create Cycle, Auditors and scoping Items in single Transaction
  return prisma.$transaction(async (tx) => {
    // 1. Create the Audit Cycle record
    const cycle = await tx.auditCycle.create({
      data: {
        organizationId: orgId,
        name,
        scopeType,
        scopeDepartmentId: scopeType === 'Department' ? scopeDepartmentId : null,
        scopeLocation: scopeType === 'Location' ? scopeLocation : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'Draft',
        createdBy: userId
      }
    });

    // 2. Assign Auditors
    await tx.auditAuditor.createMany({
      data: auditorIds.map(empId => ({
        auditCycleId: cycle.id,
        employeeId: empId
      }))
    });

    // 3. Resolve Scope & Identify Assets
    let assets = [];
    if (scopeType === 'All') {
      assets = await tx.asset.findMany({
        where: { organizationId: orgId, deletedAt: null }
      });
    } else if (scopeType === 'Location') {
      assets = await tx.asset.findMany({
        where: { organizationId: orgId, location: scopeLocation, deletedAt: null }
      });
    } else if (scopeType === 'Department') {
      assets = await tx.asset.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          OR: [
            // Direct department allocations
            {
              allocations: {
                some: {
                  departmentId: scopeDepartmentId,
                  status: 'Active',
                  actualReturnDate: null
                }
              }
            },
            // Allocations to employees belonging to department
            {
              allocations: {
                some: {
                  employee: {
                    departmentId: scopeDepartmentId
                  },
                  status: 'Active',
                  actualReturnDate: null
                }
              }
            }
          ]
        }
      });
    }

    if (assets.length > 0) {
      // 4. Create Audit Items for scoping assets
      await tx.auditItem.createMany({
        data: assets.map(a => ({
          auditCycleId: cycle.id,
          assetId: a.id,
          verificationStatus: 'Pending'
        }))
      });
    }

    // Log Activity
    await logActivity({
      organizationId: orgId,
      userId,
      action: 'CREATE_AUDIT_CYCLE',
      entityType: 'AuditCycle',
      entityId: cycle.id,
      details: { name, scopeType, scopedAssetsCount: assets.length }
    });

    return {
      ...cycle,
      scopedAssetsCount: assets.length
    };
  });
}

/**
 * Lists audit cycles.
 */
async function listCycles(orgId) {
  return prisma.auditCycle.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      department: { select: { id: true, name: true } },
      auditors: {
        include: {
          employee: { select: { id: true, name: true, email: true } }
        }
      },
      _count: { select: { items: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Retrieves details of a specific audit cycle, including verified and pending items.
 */
async function getCycle(orgId, cycleId) {
  const cycle = await prisma.auditCycle.findFirst({
    where: { id: cycleId, organizationId: orgId, deletedAt: null },
    include: {
      department: { select: { id: true, name: true } },
      auditors: {
        include: {
          employee: { select: { id: true, name: true, email: true } }
        }
      },
      items: {
        include: {
          asset: { select: { id: true, name: true, assetTag: true, location: true, status: true, condition: true } },
          auditor: { select: { id: true, name: true } }
        }
      }
    }
  });

  if (!cycle) {
    throw new AppError('Audit cycle not found.', 404, 'AUDIT_CYCLE_NOT_FOUND');
  }

  return cycle;
}

/**
 * Activates a draft audit cycle (Admin only).
 */
async function startCycle(userId, orgId, cycleId) {
  const cycle = await prisma.auditCycle.findFirst({
    where: { id: cycleId, organizationId: orgId, deletedAt: null }
  });

  if (!cycle) {
    throw new AppError('Audit cycle not found.', 404, 'AUDIT_CYCLE_NOT_FOUND');
  }

  if (cycle.status !== 'Draft') {
    throw new AppError('Audit cycle is already active or closed.', 400, 'INVALID_AUDIT_STATUS');
  }

  const updatedCycle = await prisma.auditCycle.update({
    where: { id: cycleId },
    data: { status: 'Active', updatedBy: userId }
  });

  // Log Activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'START_AUDIT_CYCLE',
    entityType: 'AuditCycle',
    entityId: cycleId,
    details: { name: cycle.name }
  });

  // Notify Auditors assigned to this cycle
  const auditors = await prisma.auditAuditor.findMany({
    where: { auditCycleId: cycleId },
    include: { employee: true }
  });

  for (const aud of auditors) {
    const notif = await prisma.notification.create({
      data: {
        organizationId: orgId,
        recipientId: aud.employeeId,
        title: 'New Audit Cycle Started',
        message: `You have been assigned as an auditor for "${cycle.name}". Please start verifying scope assets.`,
        type: 'Audit Discrepancy Flagged', // general audit alert
        relatedEntityType: 'AuditCycle',
        relatedEntityId: cycleId
      }
    });
    socket.emitToUser(aud.employeeId, 'notification', notif);
  }

  socket.emitToOrg(orgId, 'audit_started', updatedCycle);

  return updatedCycle;
}

/**
 * Auditor verifies a specific asset within an active audit cycle.
 */
async function verifyItem(userId, orgId, itemId, { verificationStatus, notes }) {
  // Find Audit Item including cycle details and auditors
  const item = await prisma.auditItem.findUnique({
    where: { id: itemId },
    include: {
      asset: { select: { name: true, assetTag: true } },
      auditCycle: {
        include: {
          auditors: true
        }
      }
    }
  });

  if (!item || item.auditCycle.organizationId !== orgId) {
    throw new AppError('Audit item not found.', 404, 'AUDIT_ITEM_NOT_FOUND');
  }

  if (item.auditCycle.status !== 'Active') {
    throw new AppError('Audit cycle is not in an Active state.', 400, 'CYCLE_INACTIVE');
  }

  // Check if logged-in user is an assigned auditor for this cycle
  const isAssigned = item.auditCycle.auditors.some(a => a.employeeId === userId);
  if (!isAssigned) {
    throw new AppError('Forbidden. You are not assigned as an auditor for this cycle.', 403, 'FORBIDDEN');
  }

  // Update Item verification details
  const updatedItem = await prisma.auditItem.update({
    where: { id: itemId },
    data: {
      auditorId: userId,
      verificationStatus,
      notes: notes || null,
      verifiedAt: new Date(),
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
    action: 'VERIFY_AUDIT_ITEM',
    entityType: 'AuditItem',
    entityId: itemId,
    details: { assetTag: item.asset.assetTag, status: verificationStatus }
  });

  // Discrepancy notifications (Missing/Damaged)
  if (verificationStatus === 'Missing' || verificationStatus === 'Damaged') {
    // Notify Asset Managers
    const managers = await prisma.employee.findMany({
      where: { organizationId: orgId, role: 'Asset Manager', status: 'Active', deletedAt: null }
    });

    for (const mgr of managers) {
      const notif = await prisma.notification.create({
        data: {
          organizationId: orgId,
          recipientId: mgr.id,
          title: `Audit Discrepancy: ${verificationStatus} Asset`,
          message: `Asset "${item.asset.name}" (${item.asset.assetTag}) was flagged as "${verificationStatus}" during cycle "${item.auditCycle.name}".`,
          type: 'Audit Discrepancy Flagged',
          relatedEntityType: 'AuditItem',
          relatedEntityId: itemId
        }
      });
      socket.emitToUser(mgr.id, 'notification', notif);
    }
  }

  // Notify socket rooms of verification update
  socket.emitToOrg(orgId, 'audit_item_verified', updatedItem);

  return updatedItem;
}

/**
 * Closes an audit cycle and locks findings (Admin only).
 */
async function closeCycle(userId, orgId, cycleId) {
  const cycle = await prisma.auditCycle.findFirst({
    where: { id: cycleId, organizationId: orgId, deletedAt: null },
    include: {
      items: {
        include: { asset: true }
      }
    }
  });

  if (!cycle) {
    throw new AppError('Audit cycle not found.', 404, 'AUDIT_CYCLE_NOT_FOUND');
  }

  if (cycle.status !== 'Active') {
    throw new AppError('Only active cycles can be closed.', 400, 'INVALID_AUDIT_STATUS');
  }

  // Check if there are any unverified items
  const pendingCount = cycle.items.filter(i => i.verificationStatus === 'Pending').length;
  if (pendingCount > 0) {
    throw new AppError(`Cannot close cycle. There are still ${pendingCount} pending assets remaining to be audited.`, 400, 'PENDING_AUDIT_ITEMS');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Close and lock the Audit Cycle
    const closedCycle = await tx.auditCycle.update({
      where: { id: cycleId },
      data: { status: 'Closed', updatedBy: userId }
    });

    // 2. Lock findings & update asset statuses
    for (const item of cycle.items) {
      if (item.verificationStatus === 'Missing') {
        // Mark asset as Lost
        await tx.asset.update({
          where: { id: item.assetId },
          data: { status: 'Lost' }
        });

        // Close any active allocations for this asset as returned
        await tx.allocation.updateMany({
          where: { assetId: item.assetId, status: 'Active', actualReturnDate: null },
          data: {
            status: 'Returned',
            actualReturnDate: new Date(),
            returnCondition: 'Poor',
            returnNotes: `Force closed: Flagged as Missing in Audit Cycle "${cycle.name}".`
          }
        });
      } else if (item.verificationStatus === 'Damaged') {
        // Update condition to Damaged
        await tx.asset.update({
          where: { id: item.assetId },
          data: { condition: 'Damaged' }
        });
      }
    }

    // Log Activity
    await logActivity({
      organizationId: orgId,
      userId,
      action: 'CLOSE_AUDIT_CYCLE',
      entityType: 'AuditCycle',
      entityId: cycleId,
      details: { name: cycle.name }
    });

    // Broadcast update and refresh KPI
    socket.emitToOrg(orgId, 'audit_closed', closedCycle);
    socket.emitToOrg(orgId, 'kpi_update', { type: 'audit' });
    socket.emitToOrg(orgId, 'kpi_update', { type: 'asset' });

    return closedCycle;
  });
}

module.exports = {
  createCycle,
  listCycles,
  getCycle,
  startCycle,
  verifyItem,
  closeCycle
};
