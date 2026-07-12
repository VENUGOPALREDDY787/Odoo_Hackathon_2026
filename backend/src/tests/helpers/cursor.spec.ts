import { encodeCursor, decodeCursor, buildCursorPage, parseCursorParams } from '../../utils/cursor-pagination';

describe('Cursor-Based Pagination Helper', () => {
  describe('encodeCursor & decodeCursor', () => {
    it('should encode cursor payload to base64url and decode it back', () => {
      const payload = { id: 'asset-123', createdAt: '2026-07-12T12:00:00.000Z' };
      const encoded = encodeCursor(payload);
      expect(typeof encoded).toBe('string');
      expect(encoded).not.toBe('');

      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(payload);
    });

    it('should return null for malformed or undefined cursors', () => {
      expect(decodeCursor(undefined)).toBeNull();
      expect(decodeCursor('')).toBeNull();
      expect(decodeCursor('invalid-base64-string!@#')).toBeNull();
      expect(decodeCursor(Buffer.from('{"no_id": true}').toString('base64url'))).toBeNull();
    });
  });

  describe('parseCursorParams', () => {
    it('should parse valid cursor parameters and limit', () => {
      const payload = { id: 'asset-123' };
      const encoded = encodeCursor(payload);
      
      const parsed = parseCursorParams({ cursor: encoded, limit: '15' });
      expect(parsed.cursor).toEqual(payload);
      expect(parsed.pageSize).toBe(15);
    });

    it('should default limit to 20 if missing or invalid', () => {
      const parsed = parseCursorParams({});
      expect(parsed.cursor).toBeNull();
      expect(parsed.pageSize).toBe(20);
    });

    it('should cap limit between 1 and 100', () => {
      const parsedMin = parseCursorParams({ limit: '0' });
      expect(parsedMin.pageSize).toBe(1);

      const parsedMax = parseCursorParams({ limit: '150' });
      expect(parsedMax.pageSize).toBe(100);
    });
  });

  describe('buildCursorPage', () => {
    it('should build pagination metadata when hasNextPage is false', () => {
      const data = [
        { id: '1', name: 'Asset A', createdAt: new Date() },
        { id: '2', name: 'Asset B', createdAt: new Date() },
      ];

      const page = buildCursorPage(data, 5);
      expect(page.data).toHaveLength(2);
      expect(page.pagination.hasNextPage).toBe(false);
      expect(page.pagination.nextCursor).toBeNull();
      expect(page.pagination.pageSize).toBe(5);
    });

    it('should build nextCursor when there is a next page', () => {
      const data = [
        { id: '1', name: 'Asset A', createdAt: new Date() },
        { id: '2', name: 'Asset B', createdAt: new Date() },
        { id: '3', name: 'Asset C', createdAt: new Date() },
      ];

      // Request page size 2, but fetch 3 (2 + 1)
      const page = buildCursorPage(data, 2);
      expect(page.data).toHaveLength(2);
      expect(page.pagination.hasNextPage).toBe(true);
      expect(page.pagination.nextCursor).not.toBeNull();
      
      const decoded = decodeCursor(page.pagination.nextCursor!);
      expect(decoded?.id).toBe('2');
    });
  });
});
