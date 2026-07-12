/**
 * Formats a successful API response.
 * @param {any} data - The payload to send to the client.
 * @param {object} [meta] - Optional pagination or metadata.
 */
function successResponse(data, meta = null) {
  return {
    success: true,
    data,
    error: null,
    meta
  };
}

/**
 * Formats an error API response.
 * @param {string} message - User-facing error message.
 * @param {string} [code] - Internal error code (e.g. 'VALIDATION_ERROR', 'UNAUTHORIZED').
 * @param {any} [details] - Detailed error context (e.g. Zod field errors).
 */
function errorResponse(message, code = 'INTERNAL_ERROR', details = null) {
  return {
    success: false,
    data: null,
    error: {
      message,
      code,
      details
    },
    meta: null
  };
}

module.exports = {
  success: successResponse,
  error: errorResponse
};
