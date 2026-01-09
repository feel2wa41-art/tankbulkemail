/**
 * Worker Client Service
 * Worker 엔진과 통신하는 클라이언트 서비스
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TriggerResult {
  success: boolean;
  runId?: number;
  jobId?: string;
  error?: string;
}

export interface WorkerHealth {
  status: 'healthy' | 'unhealthy';
  schedulerRunning: boolean;
  redisConnected: boolean;
}

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);
  private readonly workerUrl: string;
  private readonly devMode: boolean;

  constructor(private configService: ConfigService) {
    this.workerUrl = this.configService.get<string>('WORKER_URL', 'http://localhost:3002');
    this.devMode = this.configService.get<string>('DEV_MODE') === 'true';
  }

  /**
   * 수동으로 자동화 실행 트리거
   */
  async triggerAutomation(autoId: number): Promise<TriggerResult> {
    if (this.devMode) {
      this.logger.log(`[DEV MODE] Would trigger automation: ${autoId}`);
      return {
        success: true,
        runId: Date.now(),
        jobId: `dev-job-${autoId}-${Date.now()}`,
      };
    }

    try {
      const response = await fetch(`${this.workerUrl}/trigger/${autoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Worker responded with ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      this.logger.log(`Automation ${autoId} triggered successfully: jobId=${result.jobId}`);

      return {
        success: true,
        runId: result.runId,
        jobId: result.jobId,
      };

    } catch (error: any) {
      this.logger.error(`Failed to trigger automation ${autoId}:`, error.message);

      return {
        success: false,
        error: this.categorizeError(error),
      };
    }
  }

  /**
   * Worker 헬스 체크
   */
  async checkHealth(): Promise<WorkerHealth> {
    if (this.devMode) {
      return {
        status: 'healthy',
        schedulerRunning: true,
        redisConnected: true,
      };
    }

    try {
      const response = await fetch(`${this.workerUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5초 타임아웃
      });

      if (!response.ok) {
        return {
          status: 'unhealthy',
          schedulerRunning: false,
          redisConnected: false,
        };
      }

      const data = await response.json();

      return {
        status: data.status === 'ok' ? 'healthy' : 'unhealthy',
        schedulerRunning: data.schedulerRunning ?? false,
        redisConnected: data.redisConnected ?? false,
      };

    } catch (error: any) {
      this.logger.warn(`Worker health check failed: ${error.message}`);

      return {
        status: 'unhealthy',
        schedulerRunning: false,
        redisConnected: false,
      };
    }
  }

  /**
   * SES 발송 할당량 조회
   */
  async getSesQuota(): Promise<{
    max24HourSend: number;
    sentLast24Hours: number;
    remaining: number;
    maxSendRate: number;
  } | null> {
    if (this.devMode) {
      return {
        max24HourSend: 50000,
        sentLast24Hours: 0,
        remaining: 50000,
        maxSendRate: 14,
      };
    }

    try {
      const response = await fetch(`${this.workerUrl}/quota`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();

    } catch (error: any) {
      this.logger.warn(`Failed to get SES quota: ${error.message}`);
      return null;
    }
  }

  /**
   * 큐 상태 조회
   */
  async getQueueStatus(): Promise<{
    success: boolean;
    data: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  }> {
    if (this.devMode) {
      return {
        success: true,
        data: {
          waiting: 0,
          active: 0,
          completed: 100,
          failed: 2,
          delayed: 0,
        },
      };
    }

    try {
      const response = await fetch(`${this.workerUrl}/queue/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Worker responded with ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      this.logger.warn(`Failed to get queue status: ${error.message}`);
      return {
        success: false,
        data: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        },
      };
    }
  }

  /**
   * 실패한 작업 목록 조회
   */
  async getFailedJobs(autoId?: number): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      name: string;
      data: {
        runId: number;
        autoId: number;
        recipient: string;
        subject: string;
      };
      failedReason: string;
      attemptsMade: number;
      timestamp: number;
    }>;
  }> {
    if (this.devMode) {
      return {
        success: true,
        data: [],
      };
    }

    try {
      const url = new URL(`${this.workerUrl}/queue/failed`);
      if (autoId) {
        url.searchParams.set('autoId', autoId.toString());
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Worker responded with ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      this.logger.warn(`Failed to get failed jobs: ${error.message}`);
      return {
        success: false,
        data: [],
      };
    }
  }

  /**
   * 특정 작업 재시도
   */
  async retryJob(jobId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    if (this.devMode) {
      this.logger.log(`[DEV MODE] Would retry job: ${jobId}`);
      return {
        success: true,
        message: `Job ${jobId} queued for retry`,
      };
    }

    try {
      const response = await fetch(`${this.workerUrl}/queue/retry/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Worker responded with ${response.status}`);
      }

      const result = await response.json();
      this.logger.log(`Job ${jobId} queued for retry`);

      return {
        success: true,
        message: result.message || `Job ${jobId} queued for retry`,
      };
    } catch (error: any) {
      this.logger.error(`Failed to retry job ${jobId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 모든 실패한 작업 재시도
   */
  async retryAllJobs(autoId?: number): Promise<{
    success: boolean;
    data?: { retried: number };
    error?: string;
  }> {
    if (this.devMode) {
      this.logger.log(`[DEV MODE] Would retry all failed jobs${autoId ? ` for autoId: ${autoId}` : ''}`);
      return {
        success: true,
        data: { retried: 0 },
      };
    }

    try {
      const url = new URL(`${this.workerUrl}/queue/retry-all`);
      if (autoId) {
        url.searchParams.set('autoId', autoId.toString());
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Worker responded with ${response.status}`);
      }

      const result = await response.json();
      this.logger.log(`Retried ${result.data?.retried || 0} failed jobs`);

      return {
        success: true,
        data: result.data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to retry all jobs: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private categorizeError(error: any): string {
    const message = error.message || 'Unknown error';

    if (message.includes('ECONNREFUSED')) {
      return 'Worker is not running. Please start the worker engine.';
    }

    if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
      return 'Worker is not responding. Check worker status.';
    }

    if (message.includes('ENOTFOUND')) {
      return 'Worker URL is invalid. Check WORKER_URL configuration.';
    }

    return `Worker error: ${message}`;
  }
}
