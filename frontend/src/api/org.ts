/**
 * Organization API Service
 */
import { apiClient } from './client';
import { ApiResponse, Org, CreateOrgDto, UpdateOrgDto } from '../types';

export const orgApi = {
  getAll: async (): Promise<ApiResponse<Org[]>> => {
    const response = await apiClient.get('/org');
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Org>> => {
    const response = await apiClient.get(`/org/${id}`);
    return response.data;
  },

  create: async (data: CreateOrgDto): Promise<ApiResponse<Org>> => {
    const response = await apiClient.post('/org', data);
    return response.data;
  },

  update: async (id: number, data: UpdateOrgDto): Promise<ApiResponse<Org>> => {
    const response = await apiClient.put(`/org/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/org/${id}`);
    return response.data;
  },
};
