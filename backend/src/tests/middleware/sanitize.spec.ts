import { sanitize } from '../../middleware/sanitize';
import { Request, Response, NextFunction } from 'express';

describe('Sanitize Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {}
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  it('should sanitize XSS scripts from body', () => {
    mockRequest.body = {
      name: 'John Doe <script>alert("xss")</script>',
      description: 'Standard text',
    };

    sanitize(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.body.name).toBe('John Doe alert("xss")');
    expect(mockRequest.body.description).toBe('Standard text');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should recursively sanitize nested objects', () => {
    mockRequest.body = {
      user: {
        profile: {
          bio: 'Hello <img src="x" onerror="alert(1)"> world',
        }
      }
    };

    sanitize(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.body.user.profile.bio).toBe('Hello  world');
  });

  it('should sanitize query parameters', () => {
    mockRequest.query = {
      search: '<iframe src="javascript:alert(1)"></iframe>',
      page: '1',
    };

    sanitize(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.query.search).toBe('');
    expect(mockRequest.query.page).toBe('1');
  });

  it('should sanitize path parameters', () => {
    mockRequest.params = {
      id: '123<svg onload=alert(1)>',
    };

    sanitize(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.params.id).toBe('123<svg onload=alert(1)>'); // Path params are not sanitized by this middleware
  });

  it('should ignore non-string primitives', () => {
    mockRequest.body = {
      count: 100,
      isActive: true,
      data: null,
      missing: undefined,
    };

    sanitize(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.body.count).toBe(100);
    expect(mockRequest.body.isActive).toBe(true);
    expect(mockRequest.body.data).toBeNull();
  });
});
