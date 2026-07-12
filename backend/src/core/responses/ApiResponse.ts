import { Response } from 'express';

export class ApiResponse {
  /**
   * Sends a standardized HTTP success response.
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Request processed successfully',
    statusCode: number = 200,
    meta: any = null
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta
    });
  }

  /**
   * Sends a standardized HTTP error response.
   */
  static error(
    res: Response,
    message: string,
    errorCode: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details: any = null
  ): Response {
    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
        details
      }
    });
  }
}
export default ApiResponse;
