/**
 * Report & Log API Service
 */
import { apiClient } from './client';
import {
  ApiResponse,
  ReportSummary,
  DomainStats,
  AutoRunLog,
  EmailSendLog,
} from '../types';

export interface LogQueryParams {
  orgId?: number;
  automationId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export const reportApi = {
  getSummary: async (orgId?: number): Promise<ApiResponse<ReportSummary>> => {
    const params = orgId ? { orgId } : {};
    const response = await apiClient.get('/report/summary', { params });
    return response.data;
  },

  getDomainStats: async (
    startDate: string,
    endDate: string,
    orgId?: number
  ): Promise<ApiResponse<DomainStats[]>> => {
    const response = await apiClient.get('/report/domain-stats', {
      params: { startDate, endDate, orgId },
    });
    return response.data;
  },

  getTimeline: async (
    startDate: string,
    endDate: string,
    orgId?: number
  ): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/report/timeline', {
      params: { startDate, endDate, orgId },
    });
    return response.data;
  },
};

export const logApi = {
  getAutomationLogs: async (params: LogQueryParams): Promise<ApiResponse<AutoRunLog[]>> => {
    const response = await apiClient.get('/log/automation', { params });
    return response.data;
  },

  getEmailLogs: async (params: LogQueryParams): Promise<ApiResponse<EmailSendLog[]>> => {
    const response = await apiClient.get('/log/email', { params });
    return response.data;
  },

  getSystemLogs: async (params: LogQueryParams): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/log/system', { params });
    return response.data;
  },
};
