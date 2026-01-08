/**
 * Automation API Service
 */
import { apiClient } from './client';
import {
  ApiResponse,
  Automation,
  CreateAutomationDto,
  Template,
  EmailSetting,
  DbioTarget,
} from '../types';

export const automationApi = {
  getAll: async (orgId?: number): Promise<ApiResponse<Automation[]>> => {
    const params = orgId ? { orgId } : {};
    const response = await apiClient.get('/automation', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Automation>> => {
    const response = await apiClient.get(`/automation/${id}`);
    return response.data;
  },

  create: async (data: CreateAutomationDto): Promise<ApiResponse<Automation>> => {
    const response = await apiClient.post('/automation', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Automation>): Promise<ApiResponse<Automation>> => {
    const response = await apiClient.put(`/automation/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/automation/${id}`);
    return response.data;
  },

  run: async (id: number): Promise<ApiResponse<{ runId: number }>> => {
    const response = await apiClient.post(`/automation/${id}/run`);
    return response.data;
  },

  // DBIO
  setTarget: async (id: number, data: Partial<DbioTarget>): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/automation/${id}/dbio/target`, data);
    return response.data;
  },

  setMapping: async (id: number, data: any): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/automation/${id}/dbio/mapping`, data);
    return response.data;
  },

  setUpdateRule: async (id: number, data: any): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/automation/${id}/dbio/update`, data);
    return response.data;
  },

  // Template
  getTemplate: async (id: number): Promise<ApiResponse<Template>> => {
    const response = await apiClient.get(`/automation/${id}/template`);
    return response.data;
  },

  saveTemplate: async (id: number, data: Partial<Template>): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/automation/${id}/template`, data);
    return response.data;
  },

  previewTemplate: async (id: number, data: any): Promise<ApiResponse<string>> => {
    const response = await apiClient.post(`/automation/${id}/template/preview`, data);
    return response.data;
  },

  // Email Setting
  saveEmailSetting: async (id: number, data: Partial<EmailSetting>): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/automation/${id}/email-setting`, data);
    return response.data;
  },
};
