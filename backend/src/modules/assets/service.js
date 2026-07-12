const prisma = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { logActivity } = require('../../utils/logger');
const socket = require('../../utils/socket');

// Lifecycle State Machine Allowed Transitions
const ALLOWED_TRANSITIONS = {
  'Available': ['Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed'],
  'Allocated': ['Available', 'Under Maintenance', 'Lost'],
  'Reserved': ['Available', 'Ongoing'], // Allow booking flow transitions
  'Under Maintenance': ['Available'],
  'Lost': ['Available', 'Disposed'],
  'Retired': [],
  'Disposed': []
};

/**
 * Validates whether an asset is allowed to jump from current state to new state.
 */
function validateStateTransition(oldStatus, newStatus) {
  if (oldStatus === newStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[oldStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(`Asset lifecycle state transition from "${oldStatus}" to "${newStatus}" is not allowed.`, 400, 'INVALID_STATE_TRANSITION');
  }
  return true;
}

/**
 * Auto-generates the next sequential asset tag (e.g. AF-0006).
 */
async function generateAssetTag(tx, orgId) {
  const maxAsset = await tx.asset.findFirst({
    where: { organizationId: orgId },
    orderBy: { assetTag: 'desc' }
  });

  let nextNum = 1;
  if (maxAsset && maxAsset.assetTag && maxAsset.assetTag.startsWith('AF-')) {
    const numericPart = maxAsset.assetTag.substring(3);
    const parsed = parseInt(numericPart, 10);
    if (!isNaN(parsed)) {
      nextNum = parsed + 1;
    }
  }
  return 'AF-' + String(nextNum).padStart(4, '0');
}

/**
 * Registers a new asset.
 */
async function createAsset(userId, orgId, assetData) {
  // Validate Category exists
  const category = await prisma.assetCategory.findFirst({
    where: { id: assetData.categoryId, organizationId: orgId }
  });
  if (!category) {
    throw new AppError('Asset category not found.', 404, 'CATEGORY_NOT_FOUND');
  }

  // Transaction to generate tag and insert asset
  const asset = await prisma.$transaction(async (tx) => {
    const assetTag = await generateAssetTag(tx, orgId);

    return tx.asset.create({
      data: {
        organizationId: orgId,
        categoryId: assetData.categoryId,
        assetTag,
        serialNumber: assetData.serialNumber || null,
        name: assetData.name,
        acquisitionDate: new Date(assetData.acquisitionDate),
        acquisitionCost: assetData.acquisitionCost,
        condition: assetData.condition,
        location: assetData.location,
        status: 'Available', // Registers initially as Available
        isShared: assetData.isShared,
        imageUrl: assetData.imageUrl || null,
        documentsUrl: assetData.documentsUrl || null,
        createdBy: userId
      }
    });
  });

  // Log activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'REGISTER_ASSET',
    entityType: 'Asset',
    entityId: asset.id,
    details: { assetTag: asset.assetTag, name: asset.name }
  });

  // Broadcast real-time asset updates to organization
  socket.emitToOrg(orgId, 'asset_registered', asset);
  socket.emitToOrg(orgId, 'kpi_update', { type: 'asset' });

  return asset;
}

/**
 * Lists assets with advanced filtering, searching, and pagination.
 */
async function listAssets(orgId, query) {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const search = query.search || '';
  const categoryId = query.categoryId;
  const status = query.status;
  const location = query.location;
  const isShared = query.isShared;
  const departmentId = query.departmentId;

  // Build filters
  const where = {
    organizationId: orgId,
    deletedAt: null
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { assetTag: { contains: search } },
      { serialNumber: { contains: search } }
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (status) {
    where.status = status;
  }

  if (location) {
    where.location = { contains: location };
  }

  if (isShared !== undefined) {
    where.isShared = isShared === 'true' || isShared === true;
  }

  // Filter by department holding the asset (requires checking active allocations)
  if (departmentId) {
    where.allocations = {
      some: {
        departmentId: departmentId,
        status: 'Active',
        actualReturnDate: null
      }
    };
  }

  // Fetch count and records
  const total = await prisma.asset.count({ where });
  const assets = await prisma.asset.findMany({
    where,
    skip,
    take: limit,
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      assetTag: 'asc'
    }
  });

  return {
    assets,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Retrieve single asset details including allocation and maintenance histories.
 */
async function getAsset(orgId, assetId) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId, deletedAt: null },
    include: {
      category: true,
      allocations: {
        where: { deletedAt: null },
        include: {
          employee: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
          allocator: { select: { id: true, name: true } }
        },
        orderBy: { allocationDate: 'desc' }
      },
      maintenance: {
        include: {
          raiser: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      },
      bookings: {
        include: {
          booker: { select: { id: true, name: true } }
        },
        orderBy: { startTime: 'desc' }
      }
    }
  });

  if (!asset) {
    throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
  }

  return asset;
}

/**
 * Edit asset details, enforcing state-transition rules.
 */
async function updateAsset(userId, orgId, assetId, updateData) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId, deletedAt: null }
  });

  if (!asset) {
    throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
  }

  // If status change is requested, validate transition
  if (updateData.status && updateData.status !== asset.status) {
    validateStateTransition(asset.status, updateData.status);
    
    // Additional business rule safety checks
    if (updateData.status === 'Under Maintenance' && asset.status === 'Allocated') {
      // Deactivate active allocations if forced to maintenance
      await prisma.allocation.updateMany({
        where: { assetId, status: 'Active', actualReturnDate: null },
        data: {
          status: 'Returned',
          actualReturnDate: new Date(),
          returnCondition: 'Damaged',
          returnNotes: 'Force de-allocated due to maintenance request.'
        }
      });
    }
  }

  // Update
  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      name: updateData.name !== undefined ? updateData.name : asset.name,
      categoryId: updateData.categoryId !== undefined ? updateData.categoryId : asset.categoryId,
      serialNumber: updateData.serialNumber !== undefined ? updateData.serialNumber : asset.serialNumber,
      acquisitionDate: updateData.acquisitionDate ? new Date(updateData.acquisitionDate) : asset.acquisitionDate,
      acquisitionCost: updateData.acquisitionCost !== undefined ? updateData.acquisitionCost : asset.acquisitionCost,
      condition: updateData.condition !== undefined ? updateData.condition : asset.condition,
      location: updateData.location !== undefined ? updateData.location : asset.location,
      status: updateData.status !== undefined ? updateData.status : asset.status,
      isShared: updateData.isShared !== undefined ? updateData.isShared : asset.isShared,
      imageUrl: updateData.imageUrl !== undefined ? updateData.imageUrl : asset.imageUrl,
      documentsUrl: updateData.documentsUrl !== undefined ? updateData.documentsUrl : asset.documentsUrl,
      updatedBy: userId
    }
  });

  // Log activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'UPDATE_ASSET',
    entityType: 'Asset',
    entityId: assetId,
    details: { assetTag: asset.assetTag, oldStatus: asset.status, newStatus: updatedAsset.status }
  });

  // Broadcast real-time asset status change
  socket.emitToOrg(orgId, 'asset_updated', updatedAsset);
  socket.emitToOrg(orgId, 'kpi_update', { type: 'asset' });

  return updatedAsset;
}

/**
 * Soft-deletes an asset from the system.
 */
async function deleteAsset(userId, orgId, assetId) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: orgId, deletedAt: null }
  });

  if (!asset) {
    throw new AppError('Asset not found.', 404, 'ASSET_NOT_FOUND');
  }

  // Prevent delete if asset is currently allocated or reserved
  if (asset.status === 'Allocated' || asset.status === 'Reserved' || asset.status === 'Under Maintenance') {
    throw new AppError(`Cannot delete asset. It is currently in "${asset.status}" status.`, 400, 'DELETE_ASSET_BLOCKED');
  }

  // Soft Delete
  await prisma.asset.update({
    where: { id: assetId },
    data: { deletedAt: new Date(), updatedBy: userId }
  });

  // Log activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'DELETE_ASSET',
    entityType: 'Asset',
    entityId: assetId,
    details: { assetTag: asset.assetTag, name: asset.name }
  });

  // Broadcast updates
  socket.emitToOrg(orgId, 'asset_deleted', { id: assetId });
  socket.emitToOrg(orgId, 'kpi_update', { type: 'asset' });

  return true;
}

module.exports = {
  createAsset,
  listAssets,
  getAsset,
  updateAsset,
  deleteAsset
};
