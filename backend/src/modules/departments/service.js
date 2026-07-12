const prisma = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { logActivity } = require('../../utils/logger');

async function createDepartment(userId, orgId, { name, parentId, managerId }) {
  // Check duplicate name in org
  const duplicate = await prisma.department.findFirst({
    where: { organizationId: orgId, name: { equals: name } }
  });
  if (duplicate) {
    throw new AppError(`Department "${name}" already exists.`, 409, 'DUPLICATE_DEPARTMENT');
  }

  // Validate Parent Department hierarchy
  if (parentId) {
    const parent = await prisma.department.findFirst({
      where: { id: parentId, organizationId: orgId }
    });
    if (!parent) {
      throw new AppError('Parent department not found.', 404, 'PARENT_DEPARTMENT_NOT_FOUND');
    }
  }

  // Validate Manager employee
  if (managerId) {
    const manager = await prisma.employee.findFirst({
      where: { id: managerId, organizationId: orgId }
    });
    if (!manager) {
      throw new AppError('Manager employee not found.', 404, 'MANAGER_NOT_FOUND');
    }
  }

  // Create
  const department = await prisma.department.create({
    data: {
      organizationId: orgId,
      name,
      parentId: parentId || null,
      managerId: managerId || null,
      createdBy: userId
    }
  });

  // Log activity
  await logActivity({
    organizationId: orgId,
    userId,
    action: 'CREATE_DEPARTMENT',
    entityType: 'Department',
    entityId: department.id,
    details: { name }
  });

  return department;
}

async function listDepartments(orgId) {
  return prisma.department.findMany({
    where: { organizationId: orgId },
    include: {
      parent: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { employees: true } }
    },
    orderBy: { name: 'asc' }
  });
}

async function updateDepartment(userId, orgId, deptId, { name, parentId, managerId, status }) {
  const dept = await prisma.department.findFirst({
    where: { id: deptId, organizationId: orgId }
  });
  if (!dept) {
    throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
  }

  if (name && name !== dept.name) {
    const duplicate = await prisma.department.findFirst({
      where: { organizationId: orgId, name: { equals: name }, id: { not: deptId } }
    });
    if (duplicate) {
      throw new AppError(`Another department named "${name}" already exists.`, 409, 'DUPLICATE_DEPARTMENT');
    }
  }

  if (parentId) {
    if (parentId === deptId) {
      throw new AppError('A department cannot be its own parent.', 400, 'INVALID_HIERARCHY');
    }
    const parent = await prisma.department.findFirst({
      where: { id: parentId, organizationId: orgId }
    });
    if (!parent) {
      throw new AppError('Parent department not found.', 404, 'PARENT_DEPARTMENT_NOT_FOUND');
    }
  }

  if (managerId) {
    const manager = await prisma.employee.findFirst({
      where: { id: managerId, organizationId: orgId }
    });
    if (!manager) {
      throw new AppError('Manager employee not found.', 404, 'MANAGER_NOT_FOUND');
    }
    
    // Auto-promote employee to Department Head if their role is Employee
    if (manager.role === 'Employee') {
      await prisma.employee.update({
        where: { id: managerId },
        data: { role: 'Department Head' }
      });
      
      await logActivity({
        organizationId: orgId,
        userId,
        action: 'PROMOTE_EMPLOYEE',
        entityType: 'Employee',
        entityId: managerId,
        details: { name: manager.name, oldRole: 'Employee', newRole: 'Department Head', note: 'Auto-promoted on department assignment' }
      });
    }
  }

  const updatedDept = await prisma.department.update({
    where: { id: deptId },
    data: {
      name: name !== undefined ? name : dept.name,
      parentId: parentId !== undefined ? parentId : dept.parentId,
      managerId: managerId !== undefined ? managerId : dept.managerId,
      status: status !== undefined ? status : dept.status,
      updatedBy: userId
    }
  });

  await logActivity({
    organizationId: orgId,
    userId,
    action: 'UPDATE_DEPARTMENT',
    entityType: 'Department',
    entityId: deptId,
    details: { name: updatedDept.name, status: updatedDept.status }
  });

  return updatedDept;
}

async function deleteDepartment(userId, orgId, deptId) {
  const dept = await prisma.department.findFirst({
    where: { id: deptId, organizationId: orgId }
  });
  if (!dept) {
    throw new AppError('Department not found.', 404, 'DEPARTMENT_NOT_FOUND');
  }

  // Check if department contains active employees
  const employeeCount = await prisma.employee.count({
    where: { departmentId: deptId, deletedAt: null }
  });
  if (employeeCount > 0) {
    throw new AppError('Cannot delete department. It contains active employees.', 400, 'DELETE_DEPARTMENT_BLOCKED');
  }

  // Delete
  await prisma.department.delete({
    where: { id: deptId }
  });

  await logActivity({
    organizationId: orgId,
    userId,
    action: 'DELETE_DEPARTMENT',
    entityType: 'Department',
    entityId: deptId,
    details: { name: dept.name }
  });

  return true;
}

module.exports = {
  createDepartment,
  listDepartments,
  updateDepartment,
  deleteDepartment
};
