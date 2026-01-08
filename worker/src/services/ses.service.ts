import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { createLogger } from '../config/logger';
import { FileInfo } from './file.service';

const logger = createLogger('SesService');

interface SendParams {
  to: string;
  subject: string;
  htmlBody: string;
  senderEmail: string;
  senderName: string;
  attachment?: FileInfo | null;
}

export class SesService {
  private client: SESClient;
  private devMode: boolean;
  private rateLimit: number;
  private lastSendTime: number = 0;

  constructor() {
    this.client = new SESClient({
      region: process.env.AWS_REGION || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.devMode = process.env.DEV_MODE === 'true';
    this.rateLimit = parseInt(process.env.SES_RATE_LIMIT || '14', 10);
  }

  async send(params: SendParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (this.devMode) {
      logger.info(`[DEV MODE] Would send email to: ${params.to}, Subject: ${params.subject}`);
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    // Rate limiting
    await this.applyRateLimit();

    try {
      const rawMessage = this.buildMimeMessage(params);

      const command = new SendRawEmailCommand({
        RawMessage: { Data: rawMessage },
      });

      const response = await this.client.send(command);

      logger.info(`Email sent to ${params.to}, MessageId: ${response.MessageId}`);
      return { success: true, messageId: response.MessageId };

    } catch (error: any) {
      logger.error(`Failed to send email to ${params.to}:`, error);
      return { success: false, error: error.message };
    }
  }

  private async applyRateLimit(): Promise<void> {
    const minInterval = 1000 / this.rateLimit; // ms between sends
    const now = Date.now();
    const elapsed = now - this.lastSendTime;

    if (elapsed < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
    }

    this.lastSendTime = Date.now();
  }

  private buildMimeMessage(params: SendParams): Uint8Array {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let message = [
      `From: ${params.senderName} <${params.senderEmail}>`,
      `To: ${params.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
    ];

    if (params.attachment) {
      message.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      message.push('');
      message.push(`--${boundary}`);
      message.push('Content-Type: text/html; charset=UTF-8');
      message.push('Content-Transfer-Encoding: base64');
      message.push('');
      message.push(Buffer.from(params.htmlBody).toString('base64'));
      message.push('');
      message.push(`--${boundary}`);
      message.push(`Content-Type: ${params.attachment.contentType}; name="${params.attachment.fileName}"`);
      message.push('Content-Transfer-Encoding: base64');
      message.push(`Content-Disposition: attachment; filename="${params.attachment.fileName}"`);
      message.push('');
      message.push(params.attachment.content.toString('base64'));
      message.push('');
      message.push(`--${boundary}--`);
    } else {
      message.push('Content-Type: text/html; charset=UTF-8');
      message.push('Content-Transfer-Encoding: base64');
      message.push('');
      message.push(Buffer.from(params.htmlBody).toString('base64'));
    }

    return new TextEncoder().encode(message.join('\r\n'));
  }
}
