class AppError extends Error {
  /**
   * @param {string} message - Error description message.
   * @param {number} statusCode - HTTP status code.
   * @param {string} [code] - Error code.
   * @param {any} [details] - Detailed error info (e.g. validator fields).
   */
  constructor(message, statusCode, code = 'APP_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  AppError
};
