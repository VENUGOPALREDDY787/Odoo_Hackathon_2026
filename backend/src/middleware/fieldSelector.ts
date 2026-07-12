import { Request, Response, NextFunction } from 'express';

/**
 * Field Selector Middleware (Sparse Responses)
 *
 * Allows API consumers to request only the fields they need via ?fields= query param.
 *
 * Example:
 *   GET /api/assets?fields=id,name,status,assetTag
 *   → Returns only those fields from the response data
 *
 * Benefits:
 *  - Reduces JSON payload size (30-80% savings on list endpoints)
 *  - Reduces serialisation overhead
 *  - Reduces client-side parsing time
 *
 * Usage:
 *   router.get('/assets', authenticate, fieldSelectorMiddleware, asyncHandler(controller.list))
 *
 * The middleware patches res.json to filter the 'data' key of the ApiResponse envelope.
 * It works transparently — controllers don't need to change.
 */

export function fieldSelectorMiddleware(req: Request, res: Response, next: NextFunction): void {
  const fieldsParam = req.query.fields as string | undefined;

  if (!fieldsParam) {
    return next(); // No field selection requested — pass through
  }

  const requestedFields = new Set(
    fieldsParam.split(',').map(f => f.trim()).filter(Boolean)
  );

  if (!requestedFields.size) return next();

  // Patch res.json to intercept and filter the response
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    if (body && body.data) {
      body.data = filterFields(body.data, requestedFields);
    }
    return originalJson(body);
  };

  next();
}

/**
 * Recursively filter object fields.
 * Works on both single objects and arrays of objects.
 */
function filterFields(data: any, fields: Set<string>): any {
  if (Array.isArray(data)) {
    return data.map(item => filterFields(item, fields));
  }

  if (data && typeof data === 'object') {
    const filtered: Record<string, any> = {};
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        filtered[field] = data[field];
      }
    }
    return filtered;
  }

  return data;
}

export default fieldSelectorMiddleware;
