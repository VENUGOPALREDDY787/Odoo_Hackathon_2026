const prisma = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { logActivity } = require('../../utils/logger');

/**
 * Get current employee profile details with department.
 */
async function getMe(userId) {
  const employee = await prisma.employee.findUnique({
    where: { id: userId, deletedAt: null },
    include: {
      department: true
    }
  });

  if (!employee) {
    throw new AppError('Employee profile not found.', 404, 'EMPLOYEE_NOT_FOUND');
  }

  const { passwordHash: _, refreshToken: __, ...result } = employee;
  return result;
}

/**
 * List all employees with filtering, searching, and pagination.
 */
async function listEmployees(orgId, query) {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const search = query.search || '';
  const role = query.role;
  const status = query.status;
  const departmentId = query.departmentId;

  // Build where conditions
  const where = {
    organizationId: orgId,
    deletedAt: null
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } }
    ];
  }

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  if (departmentId) {
    where.departmentId = departmentId;
  }

  // Count total records matching filter
  const total = await prisma.employee.count({ where });

  // Retrieve matching records
  const employees = await prisma.employee.findMany({
    where,
    skip,
    take: limit,
    include: {
      department: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Strip password hashes
  const cleanEmployees = employees.map(emp => {
    const { passwordHash: _, refreshToken: __, ...rest } = emp;
    return rest;
  });

  return {
    employees: cleanEmployees,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Promote or demote an employee's system role (Admin only).
 */
async function updateRole(adminUserId, targetEmployeeId, newRole) {
  const admin = await prisma.employee.findUnique({
    where: { id: adminUserId }
  });

  // Fetch target employee
  const targetEmployee = await prisma.employee.findUnique({
    where: { id: targetEmployeeId, deletedAt: null }
  });

  if (!targetEmployee) {
    throw new AppError('Target employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
  }

  // Multi-tenant check
  if (targetEmployee.organizationId !== admin.organizationId) {
    throw new AppError('Forbidden. User belongs to a different organization.', 403, 'FORBIDDEN');
  }

  // Prevent self-demotion of the only Admin
  if (targetEmployeeId === adminUserId && newRole !== 'Admin') {
    const adminCount = await prisma.employee.count({
      where: {
        organizationId: admin.organizationId,
        role: 'Admin',
        status: 'Active',
        deletedAt: null
      }
    });
    if (adminCount <= 1) {
      throw new AppError('Cannot demote yourself. You are the only active Admin in this organization.', 400, 'DEMOTION_BLOCKED');
    }
  }

  // Update Role
  const updatedEmployee = await prisma.employee.update({
    where: { id: targetEmployeeId },
    data: { role: newRole }
  });

  // Log role update activity
  await logActivity({
    organizationId: admin.organizationId,
    userId: adminUserId,
    action: 'PROMOTE_EMPLOYEE',
    entityType: 'Employee',
    entityId: targetEmployeeId,
    details: { name: targetEmployee.name, oldRole: targetEmployee.role, newRole }
  });

  const { passwordHash: _, refreshToken: __, ...result } = updatedEmployee;
  return result;
}

/**
 * Toggles an employee's status between Active and Inactive (Admin only).
 */
async function updateStatus(adminUserId, targetEmployeeId, newStatus) {
  const admin = await prisma.employee.findUnique({
    where: { id: adminUserId }
  });

  // Fetch target employee
  const targetEmployee = await prisma.employee.findUnique({
    where: { id: targetEmployeeId, deletedAt: null }
  });

  if (!targetEmployee) {
    throw new AppError('Target employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
  }

  // Multi-tenant check
  if (targetEmployee.organizationId !== admin.organizationId) {
    throw new AppError('Forbidden. User belongs to a different organization.', 403, 'FORBIDDEN');
  }

  // Prevent self-deactivation of Admin
  if (targetEmployeeId === adminUserId && newStatus === 'Inactive') {
    throw new AppError('Cannot deactivate your own Admin account.', 400, 'DEACTIVATION_BLOCKED');
  }

  // Update Status
  const updatedEmployee = await prisma.employee.update({
    where: { id: targetEmployeeId },
    data: { status: newStatus }
  });

  // Log status change activity
  await logActivity({
    organizationId: admin.organizationId,
    userId: adminUserId,
    action: 'TOGGLE_EMPLOYEE_STATUS',
    entityType: 'Employee',
    entityId: targetEmployeeId,
    details: { name: targetEmployee.name, oldStatus: targetEmployee.status, newStatus }
  });

  const { passwordHash: _, refreshToken: __, ...result } = updatedEmployee;
  return result;
}

module.exports = {
  getMe,
  listEmployees,
  updateRole,
  updateStatus
};
