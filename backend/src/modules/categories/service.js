const prisma = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { logActivity } = require('../../utils/logger');

async function createCategory(userId, orgId, { name, customFields }) {
  // Check duplicate category name inside organization
  const duplicate = await prisma.assetCategory.findFirst({
    where: {
      organizationId: orgId,
      name: { equals: name }
    }
  });

  if (duplicate) {
    throw new AppError(`Asset category "${name}" already exists.`, 409, 'DUPLICATE_CATEGORY');
  }

  // Create category
  const category = await prisma.assetCategory.create({
    data: {
      organizationId: orgId,
      name,
      customFields: customFields || null,
      createdBy: userId
    }
  });

  // Log activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'CREATE_CATEGORY',
    entityType: 'AssetCategory',
    entityId: category.id,
    details: { name }
  });

  return category;
}

async function listCategories(orgId) {
  return prisma.assetCategory.findMany({
    where: { organizationId: orgId },
    orderBy: { name: 'asc' }
  });
}

async function updateCategory(userId, orgId, categoryId, { name, customFields }) {
  // Check category existence
  const category = await prisma.assetCategory.findFirst({
    where: { id: categoryId, organizationId: orgId }
  });

  if (!category) {
    throw new AppError('Asset category not found.', 404, 'CATEGORY_NOT_FOUND');
  }

  // Check duplicate name if changing
  if (name && name !== category.name) {
    const duplicate = await prisma.assetCategory.findFirst({
      where: {
        organizationId: orgId,
        name: { equals: name },
        id: { not: categoryId }
      }
    });

    if (duplicate) {
      throw new AppError(`Another category named "${name}" already exists.`, 409, 'DUPLICATE_CATEGORY');
    }
  }

  // Update
  const updatedCategory = await prisma.assetCategory.update({
    where: { id: categoryId },
    data: {
      name: name !== undefined ? name : category.name,
      customFields: customFields !== undefined ? customFields : category.customFields,
      updatedBy: userId
    }
  });

  // Log activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'UPDATE_CATEGORY',
    entityType: 'AssetCategory',
    entityId: categoryId,
    details: { name: updatedCategory.name }
  });

  return updatedCategory;
}

async function deleteCategory(userId, orgId, categoryId) {
  // Check category existence
  const category = await prisma.assetCategory.findFirst({
    where: { id: categoryId, organizationId: orgId }
  });

  if (!category) {
    throw new AppError('Asset category not found.', 404, 'CATEGORY_NOT_FOUND');
  }

  // Prevent deletion if category contains assets
  const assetCount = await prisma.asset.count({
    where: { categoryId, deletedAt: null }
  });

  if (assetCount > 0) {
    throw new AppError('Cannot delete category. It contains registered assets.', 400, 'DELETE_CATEGORY_BLOCKED');
  }

  // Delete
  await prisma.assetCategory.delete({
    where: { id: categoryId }
  });

  // Log activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'DELETE_CATEGORY',
    entityType: 'AssetCategory',
    entityId: categoryId,
    details: { name: category.name }
  });

  return true;
}

module.exports = {
  createCategory,
  listCategories,
  updateCategory,
  deleteCategory
};
