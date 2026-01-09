/**
 * DB Profile API Service
 * 데이터베이스 연결 프로필 관리 API
 */
import { apiClient } from './client';
import { ApiResponse } from '../types';

export type DbType = 'ORACLE' | 'MYSQL' | 'POSTGRESQL' | 'MSSQL';

export interface DbProfile {
  profileId: number;
  profileName: string;
  description: string | null;
  dbType: DbType;
  host: string;
  port: number;
  database: string;
  username: string;
  options: string | null;
  useYn: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDbProfileDto {
  profileName: string;
  description?: string;
  dbType: DbType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  options?: string;
}

export interface UpdateDbProfileDto {
  profileName?: string;
  description?: string;
  dbType?: DbType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  options?: string;
}

export interface TestConnectionDto {
  dbType: DbType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: {
    version?: string;
    time?: number;
  };
}

export const dbProfileApi = {
  /**
   * 전체 DB 프로필 목록 조회
   */
  findAll: async (): Promise<ApiResponse<DbProfile[]>> => {
    const response = await apiClient.get('/dbprofile');
    return response.data;
  },

  /**
   * DB 프로필 상세 조회
   */
  findById: async (profileId: number): Promise<ApiResponse<DbProfile>> => {
    const response = await apiClient.get(`/dbprofile/${profileId}`);
    return response.data;
  },

  /**
   * DB 프로필 생성
   */
  create: async (dto: CreateDbProfileDto): Promise<ApiResponse<DbProfile>> => {
    const response = await apiClient.post('/dbprofile', dto);
    return response.data;
  },

  /**
   * DB 프로필 수정
   */
  update: async (profileId: number, dto: UpdateDbProfileDto): Promise<ApiResponse<DbProfile>> => {
    const response = await apiClient.put(`/dbprofile/${profileId}`, dto);
    return response.data;
  },

  /**
   * DB 프로필 삭제
   */
  delete: async (profileId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/dbprofile/${profileId}`);
    return response.data;
  },

  /**
   * 연결 테스트
   */
  testConnection: async (dto: TestConnectionDto): Promise<TestConnectionResult> => {
    const response = await apiClient.post('/dbprofile/test', dto);
    return response.data;
  },
};
