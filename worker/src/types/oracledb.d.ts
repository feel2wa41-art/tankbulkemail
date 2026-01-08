/**
 * Oracle Database Type Declarations
 * 기본 타입 정의
 */
declare module 'oracledb' {
  export const POOL_STATUS_OPEN: number;
  export const POOL_STATUS_DRAINING: number;
  export const POOL_STATUS_CLOSED: number;

  export const OUT_FORMAT_ARRAY: number;
  export const OUT_FORMAT_OBJECT: number;

  export const BIND_IN: number;
  export const BIND_OUT: number;
  export const BIND_INOUT: number;

  export const STRING: number;
  export const NUMBER: number;
  export const DATE: number;
  export const CURSOR: number;
  export const BUFFER: number;
  export const CLOB: number;
  export const BLOB: number;

  export let outFormat: number;
  export let autoCommit: boolean;
  export let fetchArraySize: number;

  export interface PoolAttributes {
    user: string;
    password: string;
    connectString: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
    poolTimeout?: number;
    poolPingInterval?: number;
  }

  export interface Pool {
    close(drainTime?: number): Promise<void>;
    getConnection(): Promise<Connection>;
    status: number;
    poolMax: number;
    poolMin: number;
    connectionsOpen: number;
    connectionsInUse: number;
  }

  export interface ExecuteOptions {
    outFormat?: number;
    autoCommit?: boolean;
    fetchArraySize?: number;
    maxRows?: number;
    resultSet?: boolean;
  }

  export interface BindParameters {
    [key: string]: any;
  }

  export interface Result<T = any> {
    rows?: T[];
    rowsAffected?: number;
    outBinds?: any;
    metaData?: Array<{ name: string }>;
  }

  export interface Connection {
    execute<T = any>(
      sql: string,
      binds?: BindParameters | any[],
      options?: ExecuteOptions
    ): Promise<Result<T>>;
    close(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
  }

  export function createPool(poolAttrs: PoolAttributes): Promise<Pool>;
  export function getPool(poolAlias?: string): Pool;
  export function getConnection(connAttrs?: PoolAttributes): Promise<Connection>;
}
