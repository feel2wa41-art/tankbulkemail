// API Types - Common Response Format

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Health Check
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services?: {
    database: 'ok' | 'error';
    ses: 'ok' | 'error';
    fileStorage: 'ok' | 'error';
  };
}

// Error Codes
export const ErrorCodes = {
  // Auth Errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_TOKEN_INVALID: 'AUTH_003',
  AUTH_UNAUTHORIZED: 'AUTH_004',

  // Validation Errors
  VALIDATION_ERROR: 'VAL_001',
  INVALID_INPUT: 'VAL_002',

  // Database Errors
  DB_CONNECTION_ERROR: 'DB_001',
  DB_QUERY_ERROR: 'DB_002',
  DB_NOT_FOUND: 'DB_003',

  // SES Errors
  SES_SEND_ERROR: 'SES_001',
  SES_QUOTA_EXCEEDED: 'SES_002',
  SES_THROTTLING: 'SES_003',

  // File Errors
  FILE_NOT_FOUND: 'FILE_001',
  FILE_ACCESS_DENIED: 'FILE_002',
  FILE_TOO_LARGE: 'FILE_003',

  // Template Errors
  TEMPLATE_INVALID: 'TPL_001',
  TEMPLATE_VARIABLE_UNMAPPED: 'TPL_002',

  // General Errors
  INTERNAL_ERROR: 'ERR_001',
  NOT_FOUND: 'ERR_002',
  CONFLICT: 'ERR_003',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
