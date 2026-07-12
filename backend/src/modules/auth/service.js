const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { logActivity } = require('../../utils/logger');

/**
 * Generate Access and Refresh JWTs for an employee.
 */
function generateTokens(employee) {
  const payload = {
    id: employee.id,
    email: employee.email,
    role: employee.role,
    organizationId: employee.organizationId
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m'
  });

  const refreshToken = jwt.sign({ id: employee.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d'
  });

  return { accessToken, refreshToken };
}

/**
 * Registers a new employee, defaulting to the 'Employee' role.
 */
async function signup({ name, email, password, organizationId }) {
  // Check if user already exists
  const existing = await prisma.employee.findUnique({
    where: { email }
  });

  if (existing) {
    throw new AppError('Email address is already registered.', 409, 'EMAIL_EXISTS');
  }

  // Determine Organization
  let orgId = organizationId;
  if (!orgId) {
    // Look up default organization
    const defaultOrg = await prisma.organization.findFirst();
    if (!defaultOrg) {
      // Create a default one if none exists (fallback)
      const newOrg = await prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default-org'
        }
      });
      orgId = newOrg.id;
    } else {
      orgId = defaultOrg.id;
    }
  } else {
    // Validate organization exists
    const orgExists = await prisma.organization.findUnique({
      where: { id: orgId }
    });
    if (!orgExists) {
      throw new AppError('Specified organization does not exist.', 404, 'ORGANIZATION_NOT_FOUND');
    }
  }

  // Hash Password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create Employee
  const employee = await prisma.employee.create({
    data: {
      organizationId: orgId,
      name,
      email,
      passwordHash,
      role: 'Employee', // Enforced role restriction on signup
      status: 'Active'
    }
  });

  // Log signup activity
  await logActivity({
    organizationId: orgId,
    userId: employee.id,
    action: 'EMPLOYEE_SIGNUP',
    entityType: 'Employee',
    entityId: employee.id,
    details: { email, name }
  });

  // Exclude password hash from response
  const { passwordHash: _, ...result } = employee;
  return result;
}

/**
 * Authenticates an employee and returns session tokens.
 */
async function login({ email, password }) {
  // Find employee (including soft-deleted checks)
  const employee = await prisma.employee.findUnique({
    where: { email, deletedAt: null }
  });

  if (!employee) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (employee.status !== 'Active') {
    throw new AppError('Your account has been deactivated. Please contact your administrator.', 403, 'ACCOUNT_DEACTIVATED');
  }

  // Validate Password
  const passwordMatch = await bcrypt.compare(password, employee.passwordHash);
  if (!passwordMatch) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  // Generate Tokens
  const { accessToken, refreshToken } = generateTokens(employee);

  // Hash & Save refresh token in DB
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await prisma.employee.update({
    where: { id: employee.id },
    data: { refreshToken: hashedRefreshToken }
  });

  // Log login activity
  await logActivity({
    organizationId: employee.organizationId,
    userId: employee.id,
    action: 'EMPLOYEE_LOGIN',
    entityType: 'Employee',
    entityId: employee.id
  });

  // Exclude password hash
  const { passwordHash: _, refreshToken: __, ...userResult } = employee;
  return {
    user: userResult,
    accessToken,
    refreshToken
  };
}

/**
 * Refreshes an expired access token using a valid refresh token.
 */
async function refresh(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    
    // Find user
    const employee = await prisma.employee.findUnique({
      where: { id: decoded.id, deletedAt: null }
    });

    if (!employee || !employee.refreshToken) {
      throw new AppError('Session not found or invalid.', 401, 'INVALID_SESSION');
    }

    if (employee.status !== 'Active') {
      throw new AppError('Account is inactive.', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Compare refresh token with database hashed token
    const match = await bcrypt.compare(token, employee.refreshToken);
    if (!match) {
      throw new AppError('Session verification failed.', 401, 'INVALID_SESSION');
    }

    // Generate New Tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(employee);

    // Save new hashed refresh token
    const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await prisma.employee.update({
      where: { id: employee.id },
      data: { refreshToken: newHashedRefreshToken }
    });

    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
  }
}

/**
 * Invalidates the employee's session by removing the refresh token.
 */
async function logout(userId) {
  await prisma.employee.update({
    where: { id: userId },
    data: { refreshToken: null }
  });

  return true;
}

module.exports = {
  signup,
  login,
  refresh,
  logout
};
