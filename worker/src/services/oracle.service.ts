/**
 * Oracle Database Service
 * Worker용 Oracle 데이터베이스 서비스
 */
import * as oracledb from 'oracledb';
import { createLogger } from '../config/logger';

const logger = createLogger('OracleService');

interface TargetRow {
  primaryKey: string;
  email: string;
  attachFileName?: string;
  [key: string]: any;
}

interface AutomationConfig {
  autoId: number;
  autoName: string;
  orgId: number;
  // Target Query
  targetQuery: string;
  // Mapping Query
  mappingQuery: string;
  // Update Query
  updateQuery?: string;
  // Template
  template: string;
  subjectTemplate: string;
  attachmentPattern?: string;
  // Email Settings
  senderEmail: string;
  senderName: string;
  replyTo?: string;
}

export class OracleService {
  private pool: oracledb.Pool | null = null;
  private initialized = false;
  private devMode: boolean;

  constructor() {
    this.devMode = process.env.DEV_MODE === 'true';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.devMode) {
      logger.info('Oracle service running in DEV MODE (mock data)');
      this.initialized = true;
      return;
    }

    try {
      const user = process.env.ORACLE_USER;
      const password = process.env.ORACLE_PASSWORD;

      if (!user || !password) {
        throw new Error('ORACLE_USER and ORACLE_PASSWORD must be set');
      }

      const config = {
        user,
        password,
        connectString: `${process.env.ORACLE_HOST || 'localhost'}:${process.env.ORACLE_PORT || '1521'}/${process.env.ORACLE_SERVICE || 'XEPDB1'}`,
        poolMin: parseInt(process.env.ORACLE_POOL_MIN || '2', 10),
        poolMax: parseInt(process.env.ORACLE_POOL_MAX || '10', 10),
        poolIncrement: 1,
        poolTimeout: 60,
      };

      this.pool = await oracledb.createPool(config);
      this.initialized = true;
      logger.info('Oracle connection pool created');
    } catch (error: any) {
      logger.error('Failed to create Oracle pool:', error);
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Falling back to mock mode');
        this.devMode = true;
        this.initialized = true;
      } else {
        throw error;
      }
    }
  }

  async loadAutomation(autoId: number): Promise<AutomationConfig | null> {
    if (this.devMode) {
      return this.getMockAutomation(autoId);
    }

    const sql = `
      SELECT
        a.AUTO_ID, a.AUTO_NAME, a.ORG_ID,
        t.TARGET_QUERY, t.MAPPING_QUERY, t.UPDATE_QUERY,
        te.BODY_HTML as TEMPLATE, te.SUBJECT as SUBJECT_TEMPLATE,
        te.ATTACHMENT_PATTERN,
        e.FROM_EMAIL as SENDER_EMAIL, e.FROM_NAME as SENDER_NAME, e.REPLY_TO
      FROM AUTOMATION a
      LEFT JOIN DBIO_TARGET t ON a.AUTO_ID = t.AUTO_ID
      LEFT JOIN TEMPLATE te ON a.AUTO_ID = te.AUTO_ID
      LEFT JOIN EMAIL_SETTING e ON a.AUTO_ID = e.AUTO_ID
      WHERE a.AUTO_ID = :autoId
    `;

    const result = await this.query<any>(sql, [autoId]);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      autoId: row.AUTO_ID,
      autoName: row.AUTO_NAME,
      orgId: row.ORG_ID,
      targetQuery: row.TARGET_QUERY,
      mappingQuery: row.MAPPING_QUERY,
      updateQuery: row.UPDATE_QUERY,
      template: row.TEMPLATE,
      subjectTemplate: row.SUBJECT_TEMPLATE,
      attachmentPattern: row.ATTACHMENT_PATTERN,
      senderEmail: row.SENDER_EMAIL,
      senderName: row.SENDER_NAME,
      replyTo: row.REPLY_TO,
    };
  }

  async executeTargetQuery(query: string): Promise<TargetRow[]> {
    if (this.devMode) {
      return this.getMockTargets();
    }

    logger.debug(`Executing target query: ${query.substring(0, 100)}...`);
    const result = await this.query<any>(query, []);

    return result.map((row: any) => ({
      primaryKey: row.PRIMARY_KEY || row.ID || Object.values(row)[0],
      email: row.EMAIL || row.RECIPIENT_EMAIL,
      attachFileName: row.ATTACH_FILE_NAME || row.ATTACHMENT,
      ...row,
    }));
  }

  async executeMappingQuery(query: string, primaryKey: string): Promise<Record<string, any>> {
    if (this.devMode) {
      return this.getMockMappingData(primaryKey);
    }

    logger.debug(`Executing mapping query for key: ${primaryKey}`);
    const result = await this.query<any>(query, [primaryKey]);
    return result[0] || {};
  }

  async executeUpdateQuery(query: string, primaryKey: string): Promise<void> {
    if (this.devMode) {
      logger.debug(`[DEV MODE] Update query for key: ${primaryKey}`);
      return;
    }

    logger.debug(`Executing update query for key: ${primaryKey}`);
    await this.execute(query, [primaryKey]);
  }

  async createRunLog(autoId: number, totalCount: number): Promise<number> {
    if (this.devMode) {
      return Date.now();
    }

    const sql = `
      INSERT INTO AUTO_RUN_LOG (AUTO_ID, STATUS, TOTAL_COUNT, SUCCESS_COUNT, FAIL_COUNT, STARTED_AT)
      VALUES (:autoId, 'RUNNING', :totalCount, 0, 0, SYSDATE)
      RETURNING RUN_ID INTO :runId
    `;

    const connection = await this.pool!.getConnection();
    try {
      const result = await connection.execute(sql, {
        autoId,
        totalCount,
        runId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }, { autoCommit: true });

      const outBinds = result.outBinds as any;
      return outBinds?.runId?.[0] || 0;
    } finally {
      await connection.close();
    }
  }

  async updateRunLog(
    runId: number,
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED',
    successCount: number,
    failCount: number
  ): Promise<void> {
    if (this.devMode) {
      logger.debug(`[DEV MODE] Update run log: ${runId}, status: ${status}`);
      return;
    }

    const sql = `
      UPDATE AUTO_RUN_LOG
      SET STATUS = :status,
          SUCCESS_COUNT = :successCount,
          FAIL_COUNT = :failCount,
          COMPLETED_AT = SYSDATE
      WHERE RUN_ID = :runId
    `;

    await this.execute(sql, [status, successCount, failCount, runId]);
  }

  async logEmailSend(
    runId: number,
    recipientEmail: string,
    status: 'SUCCESS' | 'FAILED',
    messageId?: string,
    errorMessage?: string
  ): Promise<void> {
    if (this.devMode) {
      logger.debug(`[DEV MODE] Email log: ${recipientEmail}, status: ${status}`);
      return;
    }

    const sql = `
      INSERT INTO EMAIL_SEND_LOG (RUN_ID, RECIPIENT_EMAIL, STATUS, MESSAGE_ID, ERROR_MESSAGE, SENT_AT)
      VALUES (:runId, :email, :status, :messageId, :errorMessage, SYSDATE)
    `;

    await this.execute(sql, [runId, recipientEmail, status, messageId || null, errorMessage || null]);
  }

  async getPendingSchedules(): Promise<Array<{
    schedulerId: number;
    autoId: number;
    type: 'REALTIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    day: number | null;
    hour: number;
    minute: number;
  }>> {
    if (this.devMode) {
      return [];
    }

    const sql = `
      SELECT s.SCHEDULER_ID, s.AUTO_ID, s.TYPE, s.DAY, s.HOUR, s.MINUTE
      FROM SCHEDULER s
      JOIN AUTOMATION a ON s.AUTO_ID = a.AUTO_ID
      WHERE s.STATUS = 'ACTIVE'
        AND a.STATUS = 'ACTIVE'
    `;

    const result = await this.query<any>(sql, []);
    return result.map((row: any) => ({
      schedulerId: row.SCHEDULER_ID,
      autoId: row.AUTO_ID,
      type: row.TYPE as 'REALTIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
      day: row.DAY,
      hour: row.HOUR,
      minute: row.MINUTE,
    }));
  }

  private async query<T>(sql: string, params: any[]): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Oracle pool not initialized');
    }

    const connection = await this.pool.getConnection();
    try {
      const result = await connection.execute(sql, params, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      return (result.rows || []) as T[];
    } finally {
      await connection.close();
    }
  }

  private async execute(sql: string, params: any[]): Promise<number> {
    if (!this.pool) {
      throw new Error('Oracle pool not initialized');
    }

    const connection = await this.pool.getConnection();
    try {
      const result = await connection.execute(sql, params, { autoCommit: true });
      return result.rowsAffected || 0;
    } finally {
      await connection.close();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close(0);
      this.pool = null;
      this.initialized = false;
      logger.info('Oracle connection pool closed');
    }
  }

  // Mock data methods for development
  private getMockAutomation(autoId: number): AutomationConfig {
    return {
      autoId,
      autoName: `Test Automation ${autoId}`,
      orgId: 1,
      targetQuery: 'SELECT * FROM MOCK_TARGETS',
      mappingQuery: 'SELECT * FROM MOCK_MAPPING WHERE ID = :1',
      template: '<html><body><h1>Hello {{name}}</h1><p>{{message}}</p></body></html>',
      subjectTemplate: 'Hello {{name}}',
      senderEmail: 'noreply@example.com',
      senderName: 'Test Sender',
    };
  }

  private getMockTargets(): TargetRow[] {
    return [
      { primaryKey: '1', email: 'test1@example.com', name: 'Test User 1' },
      { primaryKey: '2', email: 'test2@example.com', name: 'Test User 2' },
      { primaryKey: '3', email: 'test3@example.com', name: 'Test User 3' },
    ];
  }

  private getMockMappingData(primaryKey: string): Record<string, any> {
    return {
      name: `User ${primaryKey}`,
      message: `This is a test message for user ${primaryKey}`,
      date: new Date().toISOString(),
    };
  }
}
