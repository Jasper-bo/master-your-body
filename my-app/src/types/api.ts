export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "UNPROCESSABLE_ENTITY"
  | "INTERNAL_SERVER_ERROR"
  | "SERVICE_UNAVAILABLE";

export type ApiMeta = {
  timestamp: string;
  requestId: string;
};

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details: unknown;
};

export type ApiResponse<TData> =
  | {
      success: true;
      data: TData;
      error: null;
      meta: ApiMeta;
    }
  | {
      success: false;
      data: null;
      error: ApiError;
      meta: ApiMeta;
    };

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};
