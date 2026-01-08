/**
 * Worker Service Unit Tests
 * Worker 엔진 클라이언트 서비스 테스트
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WorkerService } from './worker.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('WorkerService', () => {
  let service: WorkerService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const setupMockConfig = (devMode: boolean = false) => {
    mockConfigService.get.mockImplementation((key: string, defaultValue?: string): string => {
      const config: Record<string, string> = {
        WORKER_URL: 'http://localhost:3002',
        DEV_MODE: devMode ? 'true' : 'false',
      };
      return config[key] ?? defaultValue ?? '';
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    setupMockConfig(false); // Default: production mode

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<WorkerService>(WorkerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('DEV_MODE behavior', () => {
    beforeEach(async () => {
      setupMockConfig(true); // Enable DEV_MODE

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WorkerService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<WorkerService>(WorkerService);
    });

    it('should return mock trigger result in DEV_MODE', async () => {
      const result = await service.triggerAutomation(1);

      expect(result.success).toBe(true);
      expect(result.runId).toBeDefined();
      expect(result.jobId).toMatch(/^dev-job-/);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return healthy status in DEV_MODE', async () => {
      const health = await service.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.schedulerRunning).toBe(true);
      expect(health.redisConnected).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return mock quota in DEV_MODE', async () => {
      const quota = await service.getSesQuota();

      expect(quota).not.toBeNull();
      expect(quota!.max24HourSend).toBe(50000);
      expect(quota!.remaining).toBe(50000);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('triggerAutomation()', () => {
    it('should trigger automation successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: 123, jobId: 'job-123' }),
      });

      const result = await service.triggerAutomation(1);

      expect(result.success).toBe(true);
      expect(result.runId).toBe(123);
      expect(result.jobId).toBe('job-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/trigger/1',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should handle worker error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await service.triggerAutomation(1);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle ECONNREFUSED error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await service.triggerAutomation(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not running');
    });

    it('should handle timeout error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      const result = await service.triggerAutomation(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not responding');
    });

    it('should handle ENOTFOUND error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ENOTFOUND'));

      const result = await service.triggerAutomation(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid');
    });
  });

  describe('checkHealth()', () => {
    it('should return healthy status when worker responds ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          schedulerRunning: true,
          redisConnected: true,
        }),
      });

      const health = await service.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.schedulerRunning).toBe(true);
      expect(health.redisConnected).toBe(true);
    });

    it('should return unhealthy when worker responds not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const health = await service.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.schedulerRunning).toBe(false);
      expect(health.redisConnected).toBe(false);
    });

    it('should return unhealthy when worker is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const health = await service.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.schedulerRunning).toBe(false);
      expect(health.redisConnected).toBe(false);
    });

    it('should handle missing fields in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      const health = await service.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.schedulerRunning).toBe(false);
      expect(health.redisConnected).toBe(false);
    });
  });

  describe('getSesQuota()', () => {
    it('should return quota successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          max24HourSend: 50000,
          sentLast24Hours: 1000,
          remaining: 49000,
          maxSendRate: 14,
        }),
      });

      const quota = await service.getSesQuota();

      expect(quota).not.toBeNull();
      expect(quota!.max24HourSend).toBe(50000);
      expect(quota!.sentLast24Hours).toBe(1000);
      expect(quota!.remaining).toBe(49000);
      expect(quota!.maxSendRate).toBe(14);
    });

    it('should return null when worker responds not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const quota = await service.getSesQuota();

      expect(quota).toBeNull();
    });

    it('should return null when worker is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const quota = await service.getSesQuota();

      expect(quota).toBeNull();
    });
  });
});
