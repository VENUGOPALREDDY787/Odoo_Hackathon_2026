import { success, error } from '../../utils/response';

describe('Response Utility', () => {
  describe('success()', () => {
    it('should format a success response with default message and null meta', () => {
      const data = { id: 1, name: 'Test' };
      const response = success(data);
      
      expect(response).toEqual({
        success: true,
        message: 'Operation completed successfully',
        data,
        meta: null
      });
    });

    it('should format a success response with custom message and meta', () => {
      const data = ['item1', 'item2'];
      const message = 'Items retrieved successfully';
      const meta = { page: 1, total: 2 };
      
      const response = success(data, message, meta);
      
      expect(response).toEqual({
        success: true,
        message,
        data,
        meta
      });
    });
  });

  describe('error()', () => {
    it('should format an error response with default code and null details', () => {
      const message = 'Something went wrong';
      const response = error(message);
      
      expect(response).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
          details: null
        }
      });
    });

    it('should format an error response with custom code and details', () => {
      const message = 'Validation failed';
      const code = 'VALIDATION_ERROR';
      const details = { field: 'email', reason: 'Invalid format' };
      
      const response = error(message, code, details);
      
      expect(response).toEqual({
        success: false,
        error: {
          code,
          message,
          details
        }
      });
    });
  });
});
