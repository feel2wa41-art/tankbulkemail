/**
 * User API Service
 * 사용자 관리 API
 */
import { apiClient } from './client';
import { ApiResponse } from '../types';

export interface User {
  userId: number;
  userName: string;
  userEmail: string;
  role: string;
  useYn: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  userName: string;
  userEmail: string;
  password: string;
  role?: string;
}

export interface UpdateUserDto {
  userName?: string;
  userEmail?: string;
  role?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDto {
  newPassword: string;
}

export const userApi = {
  /**
   * 전체 사용자 목록 조회
   */
  findAll: async (): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get('/user');
    return response.data;
  },

  /**
   * 사용자 상세 조회
   */
  findById: async (userId: number): Promise<ApiResponse<User>> => {
    const response = await apiClient.get(`/user/${userId}`);
    return response.data;
  },

  /**
   * 사용자 생성
   */
  create: async (dto: CreateUserDto): Promise<ApiResponse<User>> => {
    const response = await apiClient.post('/user', dto);
    return response.data;
  },

  /**
   * 사용자 수정
   */
  update: async (userId: number, dto: UpdateUserDto): Promise<ApiResponse<User>> => {
    const response = await apiClient.put(`/user/${userId}`, dto);
    return response.data;
  },

  /**
   * 비밀번호 변경 (본인)
   */
  changePassword: async (userId: number, dto: ChangePasswordDto): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/user/${userId}/change-password`, dto);
    return response.data;
  },

  /**
   * 비밀번호 초기화 (관리자)
   */
  resetPassword: async (userId: number, dto: ResetPasswordDto): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/user/${userId}/reset-password`, dto);
    return response.data;
  },

  /**
   * 사용자 삭제 (소프트 삭제)
   */
  delete: async (userId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/user/${userId}`);
    return response.data;
  },
};
