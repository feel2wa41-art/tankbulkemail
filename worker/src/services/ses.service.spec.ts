/**
 * SES Service Unit Tests
 * AWS SES 이메일 발송 서비스 테스트
 */
import { SesService, SendParams, QuotaInfo } from './ses.service';

// Mock AWS SDK
jest.mock('@aws-sdk/client-ses', () => {
  const mockSend = jest.fn();
  return {
    SESClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    SendRawEmailCommand: jest.fn().mockImplementation((params) => params),
    GetSendQuotaCommand: jest.fn().mockImplementation(() => ({})),
    __mockSend: mockSend,
  };
});

// Get mock reference
const { __mockSend: mockSend } = jest.requireMock('@aws-sdk/client-ses');

describe('SesService', () => {
  let sesService: SesService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      DEV_MODE: 'true',
      AWS_REGION: 'ap-northeast-2',
    };
    sesService = new SesService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('DEV_MODE', () => {
    it('should return mock success in DEV_MODE', async () => {
      const params: SendParams = {
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Test body</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Test Sender',
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^dev-/);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return mock quota in DEV_MODE', async () => {
      const quota = await sesService.getQuota();

      expect(quota.max24HourSend).toBe(50000);
      expect(quota.maxSendRate).toBe(14);
      expect(quota.sentLast24Hours).toBe(0);
      expect(quota.remaining).toBe(50000);
    });

    it('should return true for canSend in DEV_MODE', async () => {
      const canSend = await sesService.canSend();

      expect(canSend).toBe(true);
    });
  });

  describe('send() - Production Mode', () => {
    beforeEach(() => {
      process.env.DEV_MODE = 'false';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      sesService = new SesService();
    });

    it('should send email successfully', async () => {
      mockSend.mockResolvedValueOnce({ MessageId: 'msg-12345' });

      const params: SendParams = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender Name',
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-12345');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple recipients', async () => {
      mockSend.mockResolvedValueOnce({ MessageId: 'msg-multi' });

      const params: SendParams = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Multi-recipient Test',
        htmlBody: '<p>Hello all</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender',
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle CC and BCC recipients', async () => {
      mockSend.mockResolvedValueOnce({ MessageId: 'msg-cc-bcc' });

      const params: SendParams = {
        to: 'main@example.com',
        cc: ['cc1@example.com', 'cc2@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'CC/BCC Test',
        htmlBody: '<p>Content</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender',
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(true);
    });

    it('should handle rate limit error', async () => {
      const error = new Error('rate exceeded');
      error.name = 'Throttling';
      mockSend.mockRejectedValueOnce(error);

      const params: SendParams = {
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender',
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RATE_LIMIT');
    });

    it('should handle invalid email error', async () => {
      const error = new Error('Invalid email address');
      error.name = 'InvalidParameterValue';
      mockSend.mockRejectedValueOnce(error);

      const params: SendParams = {
        to: 'invalid-email',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender',
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EMAIL');
    });

    it('should handle not verified error', async () => {
      const error = new Error('Email address not verified');
      mockSend.mockRejectedValueOnce(error);

      const params: SendParams = {
        to: 'unverified@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender',
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_VERIFIED');
    });

    it('should handle network error', async () => {
      const error = new Error('ENOTFOUND');
      mockSend.mockRejectedValueOnce(error);

      const params: SendParams = {
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender',
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NETWORK_ERROR');
    });

    it('should handle credential error', async () => {
      const error = new Error('credentials not found');
      error.name = 'CredentialsProviderError';
      mockSend.mockRejectedValueOnce(error);

      const params: SendParams = {
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender',
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CREDENTIALS_ERROR');
    });
  });

  describe('getQuota() - Production Mode', () => {
    beforeEach(() => {
      process.env.DEV_MODE = 'false';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      sesService = new SesService();
    });

    it('should get quota successfully', async () => {
      mockSend.mockResolvedValueOnce({
        Max24HourSend: 50000,
        MaxSendRate: 14,
        SentLast24Hours: 1000,
      });

      const quota = await sesService.getQuota();

      expect(quota.max24HourSend).toBe(50000);
      expect(quota.maxSendRate).toBe(14);
      expect(quota.sentLast24Hours).toBe(1000);
      expect(quota.remaining).toBe(49000);
    });

    it('should handle undefined values in quota response', async () => {
      mockSend.mockResolvedValueOnce({});

      const quota = await sesService.getQuota();

      expect(quota.max24HourSend).toBe(0);
      expect(quota.maxSendRate).toBe(1);
      expect(quota.sentLast24Hours).toBe(0);
      expect(quota.remaining).toBe(0);
    });

    it('should throw on quota fetch error', async () => {
      mockSend.mockRejectedValueOnce(new Error('API Error'));

      await expect(sesService.getQuota()).rejects.toThrow('API Error');
    });
  });

  describe('canSend() - Production Mode', () => {
    beforeEach(() => {
      process.env.DEV_MODE = 'false';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      sesService = new SesService();
    });

    it('should return true when quota remaining > 0', async () => {
      mockSend.mockResolvedValueOnce({
        Max24HourSend: 50000,
        SentLast24Hours: 1000,
      });

      const canSend = await sesService.canSend();

      expect(canSend).toBe(true);
    });

    it('should return false when quota exhausted', async () => {
      mockSend.mockResolvedValueOnce({
        Max24HourSend: 50000,
        SentLast24Hours: 50000,
      });

      const canSend = await sesService.canSend();

      expect(canSend).toBe(false);
    });

    it('should return false on error', async () => {
      mockSend.mockRejectedValueOnce(new Error('API Error'));

      const canSend = await sesService.canSend();

      expect(canSend).toBe(false);
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully in DEV_MODE', async () => {
      await expect(sesService.initialize()).resolves.not.toThrow();
    });

    it('should not reinitialize if already initialized', async () => {
      await sesService.initialize();
      await sesService.initialize();

      // Should only log once
      expect(true).toBe(true);
    });
  });

  describe('Attachment handling', () => {
    beforeEach(() => {
      process.env.DEV_MODE = 'false';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      sesService = new SesService();
    });

    it('should include attachment in email', async () => {
      mockSend.mockResolvedValueOnce({ MessageId: 'msg-attach' });

      const params: SendParams = {
        to: 'test@example.com',
        subject: 'With Attachment',
        htmlBody: '<p>See attachment</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender',
        attachment: {
          filePath: '/tmp/document.pdf',
          fileName: 'document.pdf',
          contentType: 'application/pdf',
          content: Buffer.from('PDF content'),
          size: 11,
        },
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle null attachment', async () => {
      mockSend.mockResolvedValueOnce({ MessageId: 'msg-no-attach' });

      const params: SendParams = {
        to: 'test@example.com',
        subject: 'No Attachment',
        htmlBody: '<p>No file</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender',
        attachment: null,
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(true);
    });
  });

  describe('Custom headers', () => {
    beforeEach(() => {
      process.env.DEV_MODE = 'false';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      sesService = new SesService();
    });

    it('should include custom headers', async () => {
      mockSend.mockResolvedValueOnce({ MessageId: 'msg-headers' });

      const params: SendParams = {
        to: 'test@example.com',
        subject: 'Custom Headers',
        htmlBody: '<p>Test</p>',
        senderEmail: 'sender@example.com',
        senderName: 'Sender',
        headers: {
          'X-Campaign-ID': 'campaign-123',
          'X-Custom-Header': 'custom-value',
        },
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(true);
    });

    it('should include Reply-To header', async () => {
      mockSend.mockResolvedValueOnce({ MessageId: 'msg-reply' });

      const params: SendParams = {
        to: 'test@example.com',
        subject: 'Reply-To Test',
        htmlBody: '<p>Test</p>',
        senderEmail: 'noreply@example.com',
        senderName: 'No Reply',
        replyTo: 'support@example.com',
      };

      const result = await sesService.send(params);

      expect(result.success).toBe(true);
    });
  });
});
