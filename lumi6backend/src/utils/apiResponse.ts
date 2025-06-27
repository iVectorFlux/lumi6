import { Response } from 'express';
import { logError, logInfo } from './logger';

// Standard API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Success response helper
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  logInfo(`API Success: ${res.req.method} ${res.req.url}`, {
    statusCode,
    dataType: typeof data,
  });

  return res.status(statusCode).json(response);
};

// Error response helper
export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  logError(`API Error: ${res.req.method} ${res.req.url}`, null, {
    statusCode,
    errorCode: code,
    errorMessage: message,
    details,
  });

  return res.status(statusCode).json(response);
};

// Common error responses
export const sendValidationError = (res: Response, details: any) =>
  sendError(res, 'VALIDATION_ERROR', 'Invalid request data', 400, details);

export const sendUnauthorized = (res: Response, message: string = 'Unauthorized') =>
  sendError(res, 'UNAUTHORIZED', message, 401);

export const sendForbidden = (res: Response, message: string = 'Forbidden') =>
  sendError(res, 'FORBIDDEN', message, 403);

export const sendNotFound = (res: Response, resource: string = 'Resource') =>
  sendError(res, 'NOT_FOUND', `${resource} not found`, 404);

export const sendConflict = (res: Response, message: string) =>
  sendError(res, 'CONFLICT', message, 409);

export const sendTooManyRequests = (res: Response, message: string = 'Too many requests') =>
  sendError(res, 'TOO_MANY_REQUESTS', message, 429);

export const sendInternalError = (res: Response, message: string = 'Internal server error') =>
  sendError(res, 'INTERNAL_ERROR', message, 500);

// Pagination helper
export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
) => ({
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  },
});

// Async handler wrapper for better error handling
export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Error code constants
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const;

// Success message constants
export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  RETRIEVED: 'Resource retrieved successfully',
} as const; 