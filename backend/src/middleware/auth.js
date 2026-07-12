const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

/**
 * Authentication middleware. Verifies JWT access token and populates req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Authentication required.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Access token has expired.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid access token.', 401, 'INVALID_TOKEN'));
  }
}

/**
 * RBAC middleware creator. Checks if user role is in the list of allowed roles.
 * @param {string[]} allowedRoles - Roles allowed to access the endpoint.
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden. Insufficient permissions.', 403, 'FORBIDDEN'));
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
