/**
 * AWS SES Email Service
 * AWS SES를 통한 이메일 발송 서비스
 *
 * 온프레미스 배포 시 각 고객사의 AWS 계정 정보로 설정
 * - MTI Indonesia: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (MTI 계정)
 * - A Bank Vietnam: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (A Bank 계정)
 */
import { SESClient, SendRawEmailCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';
import { createLogger } from '../config/logger';
import { FileInfo } from './file.service';

const logger = createLogger('SesService');

export interface SendParams {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  senderEmail: string;
  senderName: string;
  replyTo?: string;
  attachment?: FileInfo | null;
  headers?: Record<string, string>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

export interface QuotaInfo {
  max24HourSend: number;
  maxSendRate: number;
  sentLast24Hours: number;
  remaining: number;
}

export class SesService {
  private client: SESClient;
  private devMode: boolean;
  private initialized = false;

  constructor() {
    this.devMode = process.env.DEV_MODE === 'true';
    this.client = this.createClient();
  }

  private createClient(): SESClient {
    const region = process.env.AWS_REGION || 'ap-northeast-2';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      if (!this.devMode) {
        logger.warn('AWS credentials not configured - SES will not work');
      }
    }

    return new SESClient({
      region,
      credentials: accessKeyId && secretAccessKey ? {
        accessKeyId,
        secretAccessKey,
      } : undefined,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.devMode) {
      try {
        // Test connection by getting quota
        const quota = await this.getQuota();
        logger.info(`SES initialized - Quota: ${quota.remaining}/${quota.max24HourSend} remaining`);
      } catch (error: any) {
        logger.error('Failed to initialize SES:', error.message);
        throw error;
      }
    } else {
      logger.info('SES running in DEV MODE (no actual emails will be sent)');
    }

    this.initialized = true;
  }

  async send(params: SendParams): Promise<SendResult> {
    // DEV MODE: 실제 발송 없이 로그만 출력
    if (this.devMode) {
      const recipients = Array.isArray(params.to) ? params.to.join(', ') : params.to;
      logger.info(`[DEV MODE] Email prepared:`);
      logger.info(`  To: ${recipients}`);
      logger.info(`  From: ${params.senderName} <${params.senderEmail}>`);
      logger.info(`  Subject: ${params.subject}`);
      if (params.attachment) {
        logger.info(`  Attachment: ${params.attachment.fileName} (${params.attachment.size} bytes)`);
      }
      return {
        success: true,
        messageId: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    }

    try {
      const rawMessage = this.buildMimeMessage(params);

      const command = new SendRawEmailCommand({
        RawMessage: { Data: rawMessage },
      });

      const response = await this.client.send(command);

      const recipients = Array.isArray(params.to) ? params.to.join(', ') : params.to;
      logger.info(`Email sent successfully to ${recipients}, MessageId: ${response.MessageId}`);

      return {
        success: true,
        messageId: response.MessageId,
      };

    } catch (error: any) {
      const recipients = Array.isArray(params.to) ? params.to.join(', ') : params.to;
      const errorInfo = this.categorizeError(error);

      logger.error(`Failed to send email to ${recipients}:`, {
        errorCode: errorInfo.code,
        errorMessage: errorInfo.message,
      });

      return {
        success: false,
        error: errorInfo.message,
        errorCode: errorInfo.code,
      };
    }
  }

  async getQuota(): Promise<QuotaInfo> {
    if (this.devMode) {
      return {
        max24HourSend: 50000,
        maxSendRate: 14,
        sentLast24Hours: 0,
        remaining: 50000,
      };
    }

    try {
      const command = new GetSendQuotaCommand({});
      const response = await this.client.send(command);

      return {
        max24HourSend: response.Max24HourSend || 0,
        maxSendRate: response.MaxSendRate || 1,
        sentLast24Hours: response.SentLast24Hours || 0,
        remaining: (response.Max24HourSend || 0) - (response.SentLast24Hours || 0),
      };
    } catch (error: any) {
      logger.error('Failed to get SES quota:', error);
      throw error;
    }
  }

  private buildMimeMessage(params: SendParams): Uint8Array {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const toAddresses = Array.isArray(params.to) ? params.to.join(', ') : params.to;

    const headers: string[] = [
      `From: =?UTF-8?B?${Buffer.from(params.senderName).toString('base64')}?= <${params.senderEmail}>`,
      `To: ${toAddresses}`,
      `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Date: ${new Date().toUTCString()}`,
    ];

    // CC recipients
    if (params.cc && params.cc.length > 0) {
      headers.push(`Cc: ${params.cc.join(', ')}`);
    }

    // BCC recipients (will not appear in message but SES handles it)
    if (params.bcc && params.bcc.length > 0) {
      headers.push(`Bcc: ${params.bcc.join(', ')}`);
    }

    // Reply-To header
    if (params.replyTo) {
      headers.push(`Reply-To: ${params.replyTo}`);
    }

    // Custom headers
    if (params.headers) {
      for (const [key, value] of Object.entries(params.headers)) {
        headers.push(`${key}: ${value}`);
      }
    }

    const lines: string[] = [...headers];

    if (params.attachment) {
      // Multipart message with attachment
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push('');

      // HTML body part
      lines.push(`--${boundary}`);
      lines.push('Content-Type: text/html; charset=UTF-8');
      lines.push('Content-Transfer-Encoding: base64');
      lines.push('');
      lines.push(this.chunkBase64(Buffer.from(params.htmlBody).toString('base64')));
      lines.push('');

      // Attachment part
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${params.attachment.contentType}; name="${params.attachment.fileName}"`);
      lines.push('Content-Transfer-Encoding: base64');
      lines.push(`Content-Disposition: attachment; filename="${params.attachment.fileName}"`);
      lines.push('');
      lines.push(this.chunkBase64(params.attachment.content.toString('base64')));
      lines.push('');
      lines.push(`--${boundary}--`);
    } else {
      // Simple HTML message
      lines.push('Content-Type: text/html; charset=UTF-8');
      lines.push('Content-Transfer-Encoding: base64');
      lines.push('');
      lines.push(this.chunkBase64(Buffer.from(params.htmlBody).toString('base64')));
    }

    return new TextEncoder().encode(lines.join('\r\n'));
  }

  private chunkBase64(base64: string): string {
    // Split base64 into 76-character lines per MIME spec
    const chunks: string[] = [];
    for (let i = 0; i < base64.length; i += 76) {
      chunks.push(base64.slice(i, i + 76));
    }
    return chunks.join('\r\n');
  }

  private categorizeError(error: any): { code: string; message: string; retryable: boolean } {
    const name = error.name || '';
    const message = error.message || 'Unknown error';

    // Throttling / Rate limit
    if (name === 'Throttling' || message.includes('rate exceeded')) {
      return {
        code: 'RATE_LIMIT',
        message: 'SES rate limit exceeded',
        retryable: true,
      };
    }

    // Invalid email address
    if (name === 'InvalidParameterValue' || message.includes('Invalid email')) {
      return {
        code: 'INVALID_EMAIL',
        message: 'Invalid email address format',
        retryable: false,
      };
    }

    // Email not verified (sandbox mode)
    if (message.includes('not verified') || message.includes('verify')) {
      return {
        code: 'NOT_VERIFIED',
        message: 'Email address not verified in SES',
        retryable: false,
      };
    }

    // Quota exceeded
    if (message.includes('quota') || message.includes('limit')) {
      return {
        code: 'QUOTA_EXCEEDED',
        message: 'Daily sending quota exceeded',
        retryable: false,
      };
    }

    // Credentials issue
    if (name === 'CredentialsProviderError' || message.includes('credentials')) {
      return {
        code: 'CREDENTIALS_ERROR',
        message: 'AWS credentials not configured or invalid',
        retryable: false,
      };
    }

    // Network/Connection error
    if (message.includes('ENOTFOUND') || message.includes('ETIMEDOUT') || message.includes('network')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection error',
        retryable: true,
      };
    }

    // Default
    return {
      code: 'SES_ERROR',
      message: message,
      retryable: false,
    };
  }

  /**
   * 발송 가능 여부 확인
   */
  async canSend(): Promise<boolean> {
    if (this.devMode) return true;

    try {
      const quota = await this.getQuota();
      return quota.remaining > 0;
    } catch {
      return false;
    }
  }
}
