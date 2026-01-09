/**
 * 공통 타입 정의
 */

// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Organization
export interface Org {
  orgId: number;
  orgName: string;
  description?: string;
  useYn: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrgDto {
  orgName: string;
  description?: string;
}

export interface UpdateOrgDto {
  orgName?: string;
  description?: string;
  useYn?: string;
}

// Automation
export interface Automation {
  autoId: number;
  orgId: number;
  autoName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'RUNNING';
  targetQuery?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationDto {
  orgId: number;
  autoName: string;
}

// DBIO Target
export interface DbioTarget {
  targetId: number;
  autoId: number;
  dbProfileId?: number;
  targetQuery: string;
  tableName?: string;
  whereClause?: string;
}

// Template
export interface Template {
  templateId: number;
  autoId: number;
  subject?: string;
  bodyHtml?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  attachmentPattern?: string;
}

// Email Setting
export interface EmailSetting {
  settingId: number;
  autoId: number;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

// Scheduler
export interface Scheduler {
  schedulerId: number;
  autoId: number;
  type: 'REALTIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  day?: number;
  hour: number;
  minute: number;
  status: string;
  createdAt: string;
}

export interface CreateSchedulerDto {
  autoId: number;
  type: 'REALTIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  day?: number;
  hour: number;
  minute: number;
}

// Logs
export interface AutoRunLog {
  runId: number;
  autoId: number;
  status: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  startedAt: string;
  completedAt?: string;
}

export interface EmailSendLog {
  logId: number;
  runId: number;
  recipientEmail: string;
  status: string;
  sentAt: string;
  errorMessage?: string;
}

// Report
export interface ReportSummary {
  totalSent: number;
  successCount: number;
  failCount: number;
  successRate: number;
  activeAutomations: number;
}

export interface DomainStats {
  domain: string;
  count: number;
  successCount: number;
  failCount: number;
}

// User/Auth
export interface User {
  userId: number;
  loginId: string;
  userName: string;
  email: string;
  role: string;
}

export interface LoginDto {
  userId: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}
