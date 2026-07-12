import { Prisma } from '@prisma/client';

export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
}

export interface SortQuery {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Builds offset pagination limits and skip values for Prisma.
 */
export function buildPagination(query: PaginationQuery) {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit as string, 10) || 10)); // Caps max page size at 100
  const skip = (page - 1) * limit;

  return {
    skip,
    take: limit,
    page,
    limit
  };
}

/**
 * Builds standard Prisma sorting maps.
 */
export function buildSorting(query: SortQuery, defaultField: string = 'createdAt', defaultOrder: 'asc' | 'desc' = 'desc') {
  const field = query.sortBy || defaultField;
  const order = query.sortOrder === 'asc' ? 'asc' : defaultOrder;

  return {
    orderBy: {
      [field]: order
    }
  };
}

/**
 * Builds case-insensitive string containment queries for search.
 */
export function buildSearch(searchField: string | string[], searchString: string): Prisma.Enumerable<any> {
  if (!searchString) return [];

  const fields = Array.isArray(searchField) ? searchField : [searchField];

  return fields.map((field) => ({
    [field]: {
      contains: searchString,
      mode: 'insensitive' // Requires MariaDB/MySQL compatible casing collation
    }
  }));
}

/**
 * Filters out empty, null, or undefined keys to create clean Prisma query conditions.
 */
export function buildFilters(filters: Record<string, any>): Record<string, any> {
  const cleanFilters: Record<string, any> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanFilters[key] = value;
    }
  });

  return cleanFilters;
}
