/**
 * Standard envelope helper for JSON body serializers (returns plain object).
 * Keeps compatibility with controller-based responses like res.status(200).json(response.success(data)).
 */
export function success<T>(data: T, message: string = 'Operation completed successfully', meta: any = null) {
  return {
    success: true,
    message,
    data,
    meta
  };
}

/**
 * Standard envelope helper for JSON body error serializers.
 */
export function error(message: string, code: string = 'INTERNAL_ERROR', details: any = null) {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
}
