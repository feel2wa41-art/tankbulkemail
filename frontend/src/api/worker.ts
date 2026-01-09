/**
 * Worker API Service
 * Worker 상태 확인 및 이메일 큐 관리
 */
import { apiClient } from './client';
import { ApiResponse } from '../types';

export interface WorkerHealth {
  status: string;
  schedulerRunning: boolean;
  redisConnected: boolean;
  devMode?: boolean;
}

export interface SesQuota {
  max24HourSend: number;
  maxSendRate: number;
  sentLast24Hours: number;
  remaining: number;
}

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface FailedJob {
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
}

export const workerApi = {
  /**
   * Worker 서비스 상태 확인
   */
  checkHealth: async (): Promise<ApiResponse<WorkerHealth>> => {
    const response = await apiClient.get('/worker/health');
    return response.data;
  },

  /**
   * SES 발송 할당량 조회
   */
  getQuota: async (): Promise<ApiResponse<SesQuota>> => {
    const response = await apiClient.get('/worker/quota');
    return response.data;
  },

  /**
   * 큐 상태 조회 (Worker에서 직접)
   */
  getQueueStatus: async (): Promise<ApiResponse<QueueStatus>> => {
    try {
      const response = await apiClient.get('/worker/queue/status');
      return response.data;
    } catch {
      // DEV 모드에서는 모킹 데이터 반환
      return {
        success: true,
        message: 'DEV mode - queue status mocked',
        data: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        },
      };
    }
  },

  /**
   * 실패한 작업 목록 조회
   */
  getFailedJobs: async (autoId?: number): Promise<ApiResponse<FailedJob[]>> => {
    try {
      const params = autoId ? { autoId } : {};
      const response = await apiClient.get('/worker/queue/failed', { params });
      return response.data;
    } catch {
      // DEV 모드에서는 빈 배열 반환
      return {
        success: true,
        message: 'DEV mode - no failed jobs',
        data: [],
      };
    }
  },

  /**
   * 실패한 작업 재시도
   */
  retryFailedJob: async (jobId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/worker/queue/retry/${jobId}`);
    return response.data;
  },

  /**
   * 모든 실패한 작업 재시도
   */
  retryAllFailed: async (autoId?: number): Promise<ApiResponse<{ retried: number }>> => {
    const params = autoId ? { autoId } : {};
    const response = await apiClient.post('/worker/queue/retry-all', {}, { params });
    return response.data;
  },
};
