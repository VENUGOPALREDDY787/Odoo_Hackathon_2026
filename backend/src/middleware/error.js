const response = require('../utils/response');
const { AppError } = require('../utils/errors');

/**
 * Express error handling middleware.
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || null;

  // Log the error for internal debugging
  console.error(`[Error] ${req.method} ${req.url} - Status: ${statusCode} - Code: ${code} - Message: ${message}`);
  if (err.stack && statusCode === 500) {
    console.error(err.stack);
  }

  // Handle Zod Validation Errors
  if (err.name === 'ZodError' || err.issues) {
    statusCode = 400;
    message = 'Validation Failed';
    code = 'VALIDATION_ERROR';
    details = err.errors ? err.errors.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    })) : err.issues;
  }

  // Handle Prisma Database Errors
  if (err.code && err.code.startsWith('P')) {
    // Prisma Client error codes: https://www.prisma.io/docs/reference/api-reference/error-reference
    statusCode = 400;
    code = `DATABASE_ERROR_${err.code}`;
    
    if (err.code === 'P2002') {
      message = 'A record with this unique value already exists.';
      details = { target: err.meta?.target };
    } else if (err.code === 'P2003') {
      message = 'Foreign key constraint failed. Related record not found.';
      details = { field: err.meta?.field_name };
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'The requested record was not found.';
    } else {
      message = 'Database operation failed.';
    }
  }

  res.status(statusCode).json(response.error(message, code, details));
}

module.exports = errorHandler;
