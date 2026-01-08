import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class EmailService {
  private sesClient: SESClient;
  private sandboxMode: boolean;

  constructor(private configService: ConfigService) {
    this.sesClient = new SESClient({
      region: this.configService.get<string>('AWS_REGION', 'ap-northeast-2'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
    this.sandboxMode = this.configService.get<string>('SES_SANDBOX_MODE') === 'true';
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    senderEmail: string;
    senderName: string;
  }) {
    if (this.sandboxMode) {
      console.log('[SES Sandbox Mode] Email would be sent:', params);
      return { success: true, messageId: 'sandbox-' + Date.now() };
    }

    const command = new SendEmailCommand({
      Source: `${params.senderName} <${params.senderEmail}>`,
      Destination: {
        ToAddresses: [params.to],
      },
      Message: {
        Subject: { Data: params.subject },
        Body: {
          Html: { Data: params.htmlBody },
        },
      },
    });

    try {
      const response = await this.sesClient.send(command);
      return { success: true, messageId: response.MessageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendRawEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    senderEmail: string;
    senderName: string;
    attachments?: Array<{ filename: string; content: Buffer }>;
  }) {
    // TODO: Implement raw email with attachments using MIME
    if (this.sandboxMode) {
      console.log('[SES Sandbox Mode] Raw email would be sent:', params);
      return { success: true, messageId: 'sandbox-' + Date.now() };
    }

    // Implement MIME construction for attachments
    return { success: false, error: 'Not implemented' };
  }
}
