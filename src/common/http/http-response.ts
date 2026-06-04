export type ApiErrorResponse = {
  success: false;
  statusCode: number;
  code: string; // stable machine-readable code
  message: string; // user friendly
  path: string;
  timestamp: string;
  requestId?: string;
  details?: unknown; // validation fields, prisma meta etc (optional)
};

export type ApiSuccessResponse<T> = {
  success: true;
  statusCode: number;
  message?: string;
  data: T;
  timestamp: string;
  requestId?: string;
};

export type ApiListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type GenericApiData<T> = {
  items: T[];
  meta: ApiListMeta;
};
