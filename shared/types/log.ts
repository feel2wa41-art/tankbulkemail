// Log Types

export type RunStatus = 'SUCCESS' | 'FAIL' | 'PARTIAL';
export type SendStatus = 'SUCCESS' | 'FAIL';
export type ErrorType = 'DB_ERROR' | 'FILE_ERROR' | 'SES_ERROR' | 'TEMPLATE_ERROR' | 'UNKNOWN';

// Automation 실행 로그
export interface AutoRunLog {
  runId: number;
  autoId: number;
  orgId: number;
  startAt: Date;
  endAt?: Date;
  status: RunStatus;
  totalTarget: number;
  successCount: number;
  failCount: number;
  fileErrorCount: number;
  dbErrorCount: number;
  sesErrorCount: number;
  message?: string;
}

// 이메일 발송 로그
export interface EmailSendLog {
  sendId: number;
  runId: number;
  autoId: number;
  orgId: number;
  custId: string;
  email: string;
  subject: string;
  attachFileName?: string;
  status: SendStatus;
  errorType?: ErrorType;
  errorMessage?: string;
  sesMessageId?: string;
  updateQueryOk: 'Y' | 'N';
  sendAt: Date;
}

// 첨부파일 로그
export interface AttachmentLog {
  logId: number;
  runId: number;
  autoId: number;
  orgId: number;
  custId: string;
  fileName: string;
  status: 'FOUND' | 'NOT_FOUND' | 'DUPLICATED' | 'INVALID';
  message?: string;
  createdAt: Date;
}

// 시스템 오류 로그
export interface SystemErrorLog {
  errorId: number;
  autoId?: number;
  orgId?: number;
  module: string;
  errorMessage: string;
  stackTrace?: string;
  createdAt: Date;
}

// SES 이벤트 로그 (Bounce/Complaint)
export interface SesEventLog {
  eventId: number;
  email: string;
  type: 'BOUNCE' | 'COMPLAINT';
  detail?: string;
  receivedAt: Date;
}

// Report Types
export interface ReportSummary {
  totalSent: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgSendTime: number;
}

export interface DomainStats {
  domain: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  successRate: number;
}

export interface TimelineData {
  hour: number;
  count: number;
  successCount: number;
  failCount: number;
}
