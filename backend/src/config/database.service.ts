import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as oracledb from 'oracledb';
import { LoggerService } from './logger.service';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: oracledb.Pool | null = null;
  private initialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Oracle Client 초기화 (Thick mode가 필요한 경우)
      // oracledb.initOracleClient({ libDir: 'path/to/instantclient' });

      const config = {
        user: this.configService.get<string>('ORACLE_USER'),
        password: this.configService.get<string>('ORACLE_PASSWORD'),
        connectString: this.getConnectString(),
        poolMin: parseInt(this.configService.get<string>('ORACLE_POOL_MIN', '2'), 10),
        poolMax: parseInt(this.configService.get<string>('ORACLE_POOL_MAX', '10'), 10),
        poolIncrement: 1,
        poolTimeout: 60,
      };

      this.pool = await oracledb.createPool(config);
      this.initialized = true;
      this.logger.log(`Oracle connection pool created successfully`, 'DatabaseService');
    } catch (error) {
      this.logger.error(`Failed to create Oracle connection pool: ${error.message}`, error.stack, 'DatabaseService');
      // 개발 환경에서는 Oracle 없이도 서버가 시작되도록 허용
      if (this.configService.get<string>('NODE_ENV') !== 'development') {
        throw error;
      }
      this.logger.warn('Running without Oracle connection in development mode', 'DatabaseService');
    }
  }

  private getConnectString(): string {
    const host = this.configService.get<string>('ORACLE_HOST', 'localhost');
    const port = parseInt(this.configService.get<string>('ORACLE_PORT', '1521'), 10);
    const service = this.configService.get<string>('ORACLE_SERVICE', 'XEPDB1');

    return `${host}:${port}/${service}`;
  }

  async getConnection(): Promise<oracledb.Connection> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool.getConnection();
  }

  /**
   * Execute a query and return results
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.pool) {
      this.logger.warn('Database not connected, returning empty result', 'DatabaseService');
      return [];
    }

    let connection: oracledb.Connection | null = null;
    try {
      connection = await this.pool.getConnection();
      const result = await connection.execute(sql, params, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
      });
      return (result.rows || []) as T[];
    } catch (error) {
      this.logger.error(`Query failed: ${error.message}`, error.stack, 'DatabaseService');
      throw error;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * Execute a query and return single row
   */
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute INSERT/UPDATE/DELETE and return affected rows
   */
  async execute(sql: string, params: any[] = []): Promise<number> {
    if (!this.pool) {
      this.logger.warn('Database not connected', 'DatabaseService');
      return 0;
    }

    let connection: oracledb.Connection | null = null;
    try {
      connection = await this.pool.getConnection();
      const result = await connection.execute(sql, params, {
        autoCommit: true,
      });
      return result.rowsAffected || 0;
    } catch (error) {
      this.logger.error(`Execute failed: ${error.message}`, error.stack, 'DatabaseService');
      throw error;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * Execute INSERT and return generated ID
   */
  async insert(sql: string, params: any[], idColumn: string = 'ID'): Promise<number> {
    if (!this.pool) {
      this.logger.warn('Database not connected', 'DatabaseService');
      return 0;
    }

    let connection: oracledb.Connection | null = null;
    try {
      connection = await this.pool.getConnection();

      // RETURNING 절을 사용하여 생성된 ID 반환
      const sqlWithReturning = `${sql} RETURNING ${idColumn} INTO :id`;
      const paramsWithId = [...params, { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }];

      const result = await connection.execute(sqlWithReturning, paramsWithId, {
        autoCommit: true,
      });

      const outBinds = result.outBinds as any;
      return outBinds?.id?.[0] || 0;
    } catch (error) {
      this.logger.error(`Insert failed: ${error.message}`, error.stack, 'DatabaseService');
      throw error;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * Execute within a transaction
   */
  async transaction<T>(callback: (connection: oracledb.Connection) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const connection = await this.pool.getConnection();
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.close();
    }
  }

  async onModuleDestroy() {
    await this.close();
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close(0);
      this.pool = null;
      this.initialized = false;
      this.logger.log('Oracle connection pool closed', 'DatabaseService');
    }
  }

  isConnected(): boolean {
    return this.pool !== null && this.initialized;
  }
}
