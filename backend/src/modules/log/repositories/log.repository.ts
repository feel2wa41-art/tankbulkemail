/**
 * Log Repository
 * 로그 관련 데이터 접근 레이어
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.service';

// Entity Interfaces
export interface AutoRunLogEntity {
  RUN_ID: number;
  AUTO_ID: number;
  ORG_ID: number;
  START_AT: Date;
  END_AT: Date | null;
  STATUS: string;
  TOTAL_TARGET: number;
  SUCCESS_COUNT: number;
  FAIL_COUNT: number;
  FILE_ERROR_COUNT: number;
  DB_ERROR_COUNT: number;
  SES_ERROR_COUNT: number;
  MESSAGE: string;
}

export interface EmailSendLogEntity {
  SEND_ID: number;
  RUN_ID: number;
  AUTO_ID: number;
  ORG_ID: number;
  CUST_ID: string;
  EMAIL: string;
  SUBJECT: string;
  ATTACH_FILE_NAME: string;
  STATUS: string;
  ERROR_TYPE: string;
  ERROR_MESSAGE: string;
  SES_MESSAGE_ID: string;
  UPDATE_QUERY_OK: string;
  SEND_AT: Date;
}

export interface AttachmentLogEntity {
  LOG_ID: number;
  RUN_ID: number;
  AUTO_ID: number;
  ORG_ID: number;
  CUST_ID: string;
  FILE_NAME: string;
  STATUS: string;
  MESSAGE: string;
  CREATED_AT: Date;
}

export interface SystemErrorLogEntity {
  ERROR_ID: number;
  AUTO_ID: number | null;
  ORG_ID: number | null;
  MODULE: string;
  ERROR_MESSAGE: string;
  STACK_TRACE: string;
  CREATED_AT: Date;
}

// DTO Interfaces
export interface CreateAutoRunLogDto {
  autoId: number;
  orgId: number;
}

export interface UpdateAutoRunLogDto {
  status: string;
  totalTarget: number;
  successCount: number;
  failCount: number;
  fileErrorCount?: number;
  dbErrorCount?: number;
  sesErrorCount?: number;
  message?: string;
}

export interface CreateEmailSendLogDto {
  runId: number;
  autoId: number;
  orgId: number;
  custId: string;
  email: string;
  subject: string;
  attachFileName?: string;
  status: string;
  errorType?: string;
  errorMessage?: string;
  sesMessageId?: string;
  updateQueryOk?: string;
}

export interface LogQueryParams {
  autoId?: number;
  orgId?: number;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class LogRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // ==================== AUTO RUN LOG ====================

  async findAutoRunLogs(params: LogQueryParams): Promise<AutoRunLogEntity[]> {
    let sql = `
      SELECT RUN_ID, AUTO_ID, ORG_ID, START_AT, END_AT, STATUS,
             TOTAL_TARGET, SUCCESS_COUNT, FAIL_COUNT, FILE_ERROR_COUNT,
             DB_ERROR_COUNT, SES_ERROR_COUNT, MESSAGE
      FROM AUTO_RUN_LOG
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.autoId) {
      sql += ` AND AUTO_ID = :${paramIndex++}`;
      queryParams.push(params.autoId);
    }
    if (params.orgId) {
      sql += ` AND ORG_ID = :${paramIndex++}`;
      queryParams.push(params.orgId);
    }
    if (params.startDate) {
      sql += ` AND START_AT >= :${paramIndex++}`;
      queryParams.push(params.startDate);
    }
    if (params.endDate) {
      sql += ` AND START_AT <= :${paramIndex++}`;
      queryParams.push(params.endDate);
    }
    if (params.status) {
      sql += ` AND STATUS = :${paramIndex++}`;
      queryParams.push(params.status);
    }

    sql += ` ORDER BY RUN_ID DESC`;

    if (params.limit) {
      sql += ` FETCH FIRST :${paramIndex++} ROWS ONLY`;
      queryParams.push(params.limit);
    }

    return this.databaseService.query<AutoRunLogEntity>(sql, queryParams);
  }

  async findAutoRunLogById(runId: number): Promise<AutoRunLogEntity | null> {
    const sql = `
      SELECT RUN_ID, AUTO_ID, ORG_ID, START_AT, END_AT, STATUS,
             TOTAL_TARGET, SUCCESS_COUNT, FAIL_COUNT, FILE_ERROR_COUNT,
             DB_ERROR_COUNT, SES_ERROR_COUNT, MESSAGE
      FROM AUTO_RUN_LOG
      WHERE RUN_ID = :1
    `;
    return this.databaseService.queryOne<AutoRunLogEntity>(sql, [runId]);
  }

  async createAutoRunLog(dto: CreateAutoRunLogDto): Promise<number> {
    const sql = `
      INSERT INTO AUTO_RUN_LOG (AUTO_ID, ORG_ID, START_AT, STATUS,
                                TOTAL_TARGET, SUCCESS_COUNT, FAIL_COUNT,
                                FILE_ERROR_COUNT, DB_ERROR_COUNT, SES_ERROR_COUNT)
      VALUES (:1, :2, SYSDATE, 'RUNNING', 0, 0, 0, 0, 0, 0)
    `;
    return this.databaseService.insert(sql, [dto.autoId, dto.orgId], 'RUN_ID');
  }

  async updateAutoRunLog(runId: number, dto: UpdateAutoRunLogDto): Promise<number> {
    const sql = `
      UPDATE AUTO_RUN_LOG
      SET END_AT = SYSDATE, STATUS = :1, TOTAL_TARGET = :2,
          SUCCESS_COUNT = :3, FAIL_COUNT = :4, FILE_ERROR_COUNT = :5,
          DB_ERROR_COUNT = :6, SES_ERROR_COUNT = :7, MESSAGE = :8
      WHERE RUN_ID = :9
    `;
    return this.databaseService.execute(sql, [
      dto.status,
      dto.totalTarget,
      dto.successCount,
      dto.failCount,
      dto.fileErrorCount || 0,
      dto.dbErrorCount || 0,
      dto.sesErrorCount || 0,
      dto.message || null,
      runId
    ]);
  }

  // ==================== EMAIL SEND LOG ====================

  async findEmailSendLogs(params: LogQueryParams): Promise<EmailSendLogEntity[]> {
    let sql = `
      SELECT SEND_ID, RUN_ID, AUTO_ID, ORG_ID, CUST_ID, EMAIL, SUBJECT,
             ATTACH_FILE_NAME, STATUS, ERROR_TYPE, ERROR_MESSAGE,
             SES_MESSAGE_ID, UPDATE_QUERY_OK, SEND_AT
      FROM EMAIL_SEND_LOG
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.autoId) {
      sql += ` AND AUTO_ID = :${paramIndex++}`;
      queryParams.push(params.autoId);
    }
    if (params.orgId) {
      sql += ` AND ORG_ID = :${paramIndex++}`;
      queryParams.push(params.orgId);
    }
    if (params.startDate) {
      sql += ` AND SEND_AT >= :${paramIndex++}`;
      queryParams.push(params.startDate);
    }
    if (params.endDate) {
      sql += ` AND SEND_AT <= :${paramIndex++}`;
      queryParams.push(params.endDate);
    }
    if (params.status) {
      sql += ` AND STATUS = :${paramIndex++}`;
      queryParams.push(params.status);
    }

    sql += ` ORDER BY SEND_ID DESC`;

    if (params.limit) {
      sql += ` FETCH FIRST :${paramIndex++} ROWS ONLY`;
      queryParams.push(params.limit);
    }

    return this.databaseService.query<EmailSendLogEntity>(sql, queryParams);
  }

  async createEmailSendLog(dto: CreateEmailSendLogDto): Promise<number> {
    const sql = `
      INSERT INTO EMAIL_SEND_LOG (RUN_ID, AUTO_ID, ORG_ID, CUST_ID, EMAIL, SUBJECT,
                                  ATTACH_FILE_NAME, STATUS, ERROR_TYPE, ERROR_MESSAGE,
                                  SES_MESSAGE_ID, UPDATE_QUERY_OK, SEND_AT)
      VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, SYSDATE)
    `;
    return this.databaseService.insert(sql, [
      dto.runId,
      dto.autoId,
      dto.orgId,
      dto.custId,
      dto.email,
      dto.subject,
      dto.attachFileName || null,
      dto.status,
      dto.errorType || null,
      dto.errorMessage || null,
      dto.sesMessageId || null,
      dto.updateQueryOk || 'N'
    ], 'SEND_ID');
  }

  // ==================== SYSTEM ERROR LOG ====================

  async findSystemErrorLogs(params: LogQueryParams): Promise<SystemErrorLogEntity[]> {
    let sql = `
      SELECT ERROR_ID, AUTO_ID, ORG_ID, MODULE, ERROR_MESSAGE, STACK_TRACE, CREATED_AT
      FROM SYSTEM_ERROR_LOG
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.autoId) {
      sql += ` AND AUTO_ID = :${paramIndex++}`;
      queryParams.push(params.autoId);
    }
    if (params.orgId) {
      sql += ` AND ORG_ID = :${paramIndex++}`;
      queryParams.push(params.orgId);
    }
    if (params.startDate) {
      sql += ` AND CREATED_AT >= :${paramIndex++}`;
      queryParams.push(params.startDate);
    }
    if (params.endDate) {
      sql += ` AND CREATED_AT <= :${paramIndex++}`;
      queryParams.push(params.endDate);
    }

    sql += ` ORDER BY ERROR_ID DESC`;

    if (params.limit) {
      sql += ` FETCH FIRST :${paramIndex++} ROWS ONLY`;
      queryParams.push(params.limit);
    }

    return this.databaseService.query<SystemErrorLogEntity>(sql, queryParams);
  }

  async createSystemErrorLog(
    module: string,
    errorMessage: string,
    stackTrace?: string,
    autoId?: number,
    orgId?: number
  ): Promise<number> {
    const sql = `
      INSERT INTO SYSTEM_ERROR_LOG (AUTO_ID, ORG_ID, MODULE, ERROR_MESSAGE, STACK_TRACE, CREATED_AT)
      VALUES (:1, :2, :3, :4, :5, SYSDATE)
    `;
    return this.databaseService.insert(sql, [
      autoId || null,
      orgId || null,
      module,
      errorMessage,
      stackTrace || null
    ], 'ERROR_ID');
  }

  // ==================== STATISTICS ====================

  async getEmailStatsByDate(startDate: Date, endDate: Date, orgId?: number): Promise<any[]> {
    let sql = `
      SELECT TRUNC(SEND_AT) AS SEND_DATE,
             COUNT(*) AS TOTAL_COUNT,
             SUM(CASE WHEN STATUS = 'SUCCESS' THEN 1 ELSE 0 END) AS SUCCESS_COUNT,
             SUM(CASE WHEN STATUS = 'FAIL' THEN 1 ELSE 0 END) AS FAIL_COUNT
      FROM EMAIL_SEND_LOG
      WHERE SEND_AT BETWEEN :1 AND :2
    `;
    const params: any[] = [startDate, endDate];

    if (orgId) {
      sql += ` AND ORG_ID = :3`;
      params.push(orgId);
    }

    sql += ` GROUP BY TRUNC(SEND_AT) ORDER BY SEND_DATE`;

    return this.databaseService.query(sql, params);
  }

  async getEmailStatsByDomain(startDate: Date, endDate: Date, orgId?: number): Promise<any[]> {
    let sql = `
      SELECT SUBSTR(EMAIL, INSTR(EMAIL, '@') + 1) AS DOMAIN,
             COUNT(*) AS TOTAL_COUNT,
             SUM(CASE WHEN STATUS = 'SUCCESS' THEN 1 ELSE 0 END) AS SUCCESS_COUNT,
             SUM(CASE WHEN STATUS = 'FAIL' THEN 1 ELSE 0 END) AS FAIL_COUNT
      FROM EMAIL_SEND_LOG
      WHERE SEND_AT BETWEEN :1 AND :2
    `;
    const params: any[] = [startDate, endDate];

    if (orgId) {
      sql += ` AND ORG_ID = :3`;
      params.push(orgId);
    }

    sql += ` GROUP BY SUBSTR(EMAIL, INSTR(EMAIL, '@') + 1)
             ORDER BY TOTAL_COUNT DESC
             FETCH FIRST 20 ROWS ONLY`;

    return this.databaseService.query(sql, params);
  }

  async getSummaryStats(orgId?: number): Promise<any> {
    let sql = `
      SELECT COUNT(*) AS TOTAL_SENT,
             SUM(CASE WHEN STATUS = 'SUCCESS' THEN 1 ELSE 0 END) AS SUCCESS_COUNT,
             SUM(CASE WHEN STATUS = 'FAIL' THEN 1 ELSE 0 END) AS FAIL_COUNT,
             COUNT(DISTINCT AUTO_ID) AS AUTOMATION_COUNT
      FROM EMAIL_SEND_LOG
      WHERE SEND_AT >= SYSDATE - 30
    `;
    const params: any[] = [];

    if (orgId) {
      sql += ` AND ORG_ID = :1`;
      params.push(orgId);
    }

    return this.databaseService.queryOne(sql, params);
  }
}
