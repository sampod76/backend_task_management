import { OffsetPagination, OffsetPaginationMeta } from './pagination.types';

export const buildOffsetPagination = (
  query: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  },
  allowedSortFields: string[],
): OffsetPagination => {
  const modifiedQuery = {
    page: query?.page ?? 1,
    limit: query.limit ?? 20,
    sortBy: query?.sortBy || 'createdAt',
    sortOrder: query?.sortOrder || 'desc',
    ...query,
  };
  const sortBy = allowedSortFields.includes(modifiedQuery?.sortBy)
    ? modifiedQuery.sortBy
    : allowedSortFields[0];

  return {
    page: modifiedQuery?.page,
    limit: modifiedQuery?.limit,
    skip: (modifiedQuery.page - 1) * modifiedQuery.limit,
    sortBy,
    sortOrder: modifiedQuery.sortOrder,
  };
};

export const buildOffsetMeta = (
  total: number,
  page: number,
  limit: number,
): OffsetPaginationMeta => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};
