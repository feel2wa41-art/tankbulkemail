// DBIO (Database I/O) Types

export type MapType = 'SIMPLE' | 'LIST' | 'TEXT';

// Target Query - 받는 사람 목록 조회
export interface DbioTarget {
  targetId: number;
  autoId: number;
  queryText: string;
  appendMode: 'Y' | 'N';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDbioTargetDto {
  queryText: string;
  appendMode?: 'Y' | 'N';
}

// Mapping Query - 템플릿 변수 매핑
export interface DbioMapping {
  mapId: number;
  autoId: number;
  queryText: string;
  mapType: MapType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDbioMappingDto {
  queryText: string;
  mapType: MapType;
}

// Update Query - 발송 완료 후 DB 업데이트
export interface DbioUpdate {
  updateId: number;
  autoId: number;
  queryText: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDbioUpdateDto {
  queryText: string;
}

// DB Profile - Oracle 연결 설정
export interface DbProfile {
  profileId: number;
  orgId: number;
  dbType: 'oracle';
  host: string;
  port: number;
  sid?: string;
  serviceName?: string;
  user: string;
  charset: string;
  useYn: 'Y' | 'N';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDbProfileDto {
  orgId: number;
  dbType: 'oracle';
  host: string;
  port: number;
  sid?: string;
  serviceName?: string;
  user: string;
  password: string;
  charset?: string;
}

export interface DbConnectionTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
}
