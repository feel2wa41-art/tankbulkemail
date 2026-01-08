// Email Types

export interface EmailSetting {
  settingId: number;
  autoId: number;
  senderEmail: string;
  senderName: string;
  returnEmail?: string;
  subjectTemplate: string;
  language: string;
  updatedAt: Date;
}

export interface CreateEmailSettingDto {
  senderEmail: string;
  senderName: string;
  returnEmail?: string;
  subjectTemplate: string;
  language?: string;
}

export interface UpdateEmailSettingDto {
  senderEmail?: string;
  senderName?: string;
  returnEmail?: string;
  subjectTemplate?: string;
  language?: string;
}

// Email Send Request (Worker 내부 사용)
export interface EmailSendRequest {
  to: string;
  subject: string;
  htmlBody: string;
  senderEmail: string;
  senderName: string;
  returnEmail?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

// SES Response
export interface SesSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

// Attachment Matching
export interface AttachmentMatchResult {
  found: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

export type AttachmentStatus = 'FOUND' | 'NOT_FOUND' | 'DUPLICATED' | 'INVALID';
