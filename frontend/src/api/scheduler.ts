/**
 * Scheduler API Service
 */
import { apiClient } from './client';
import { ApiResponse, Scheduler, CreateSchedulerDto } from '../types';

export const schedulerApi = {
  getAll: async (autoId?: number): Promise<ApiResponse<Scheduler[]>> => {
    const params = autoId ? { autoId } : {};
    const response = await apiClient.get('/scheduler', { params });
    return response.data;
  },

  getByAutomation: async (autoId: number): Promise<ApiResponse<Scheduler[]>> => {
    const response = await apiClient.get('/scheduler', { params: { autoId } });
    return response.data;
  },

  create: async (data: CreateSchedulerDto): Promise<ApiResponse<Scheduler>> => {
    const response = await apiClient.post('/scheduler', data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/scheduler/${id}`);
    return response.data;
  },
};
