/**
 * Cursor-Based Pagination Utility
 *
 * Why cursor pagination?
 *  - Offset pagination (LIMIT x OFFSET y) degrades at large offsets because
 *    MySQL must scan and discard `y` rows before returning `x` results.
 *    At offset 100,000 with 1M+ rows, this is extremely slow.
 *
 *  - Cursor pagination uses a stable reference point (the last seen record's ID
 *    or a composite of id+createdAt) so MySQL can use an index seek to jump
 *    directly to the next batch. O(1) regardless of page depth.
 *
 * Trade-offs:
 *  - Cannot jump to arbitrary page N (e.g., "go to page 50")
 *  - Suitable for infinite scroll / "load more" UIs
 *  - Offset pagination is still available for small datasets or reports
 *
 * Usage:
 *   const cursor = decodeCursor(req.query.cursor);
 *   const results = await prisma.asset.findMany({
 *     where: { ...filters, ...(cursor ? { id: { gt: cursor.id } } : {}) },
 *     take: 20 + 1, // Fetch one extra to detect hasNextPage
 *     orderBy: { id: 'asc' },
 *   });
 *   const page = buildCursorPage(results, 20);
 */

export interface CursorPayload {
  id: string;
  createdAt?: string;
}

export interface CursorPage<T> {
  data: T[];
  pagination: {
    hasNextPage: boolean;
    nextCursor: string | null;
    pageSize: number;
    count: number;
  };
}

/**
 * Encodes a cursor payload to an opaque base64 string.
 * Opaque to clients — they should not construct cursors manually.
 */
export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Decodes an opaque cursor string to its payload.
 * Returns null if the cursor is invalid or malformed.
 */
export function decodeCursor(cursor: string | undefined): CursorPayload | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (!parsed.id || typeof parsed.id !== 'string') return null;
    return parsed as CursorPayload;
  } catch {
    return null;
  }
}

/**
 * Builds a cursor-paginated response from a Prisma findMany result.
 *
 * Pattern: Always fetch `pageSize + 1` records from Prisma.
 * If we get `pageSize + 1`, there is a next page — return only `pageSize`.
 * If we get <= `pageSize`, this is the last page.
 *
 * @param results - Raw results from Prisma (fetched with take = pageSize + 1)
 * @param pageSize - The requested page size
 * @param getCursorId - Function to extract the cursor ID from a record (defaults to .id)
 */
export function buildCursorPage<T extends { id: string; createdAt?: Date }>(
  results: T[],
  pageSize: number,
  getCursorId?: (item: T) => CursorPayload
): CursorPage<T> {
  const hasNextPage = results.length > pageSize;
  const data = hasNextPage ? results.slice(0, pageSize) : results;

  const lastItem = data[data.length - 1];
  const nextCursor = hasNextPage && lastItem
    ? encodeCursor(getCursorId
        ? getCursorId(lastItem)
        : { id: lastItem.id, createdAt: lastItem.createdAt?.toISOString() }
      )
    : null;

  return {
    data,
    pagination: {
      hasNextPage,
      nextCursor,
      pageSize,
      count: data.length,
    },
  };
}

/**
 * Parses cursor pagination query params from Express request.
 * Returns safe, validated pagination values.
 */
export function parseCursorParams(query: any): {
  cursor: CursorPayload | null;
  pageSize: number;
} {
  const raw = query.cursor as string | undefined;
  const limitRaw = parseInt(query.limit || query.pageSize || '20', 10);
  const pageSize = Math.min(Math.max(1, isNaN(limitRaw) ? 20 : limitRaw), 100); // cap at 100

  return {
    cursor: decodeCursor(raw),
    pageSize,
  };
}
