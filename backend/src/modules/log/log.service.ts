/**
 * Log Service
 * 로그 관리 비즈니스 로직
 */
import { Injectable } from '@nestjs/common';
import { LogRepository, LogQueryParams, CreateEmailSendLogDto } from './repositories/log.repository';
import { DatabaseService } from '../../config/database.service';

@Injectable()
export class LogService {
  constructor(
    private readonly logRepository: LogRepository,
    private readonly databaseService: DatabaseService,
  ) {}

  async getAutomationLogs(params: LogQueryParams = {}) {
    if (!this.databaseService.isConnected()) {
      return this.getDevAutomationLogs();
    }

    try {
      const logs = await this.logRepository.findAutoRunLogs(params);
      return {
        success: true,
        data: logs.map(log => ({
          runId: log.RUN_ID,
          autoId: log.AUTO_ID,
          orgId: log.ORG_ID,
          startAt: log.START_AT,
          endAt: log.END_AT,
          status: log.STATUS,
          totalTarget: log.TOTAL_TARGET,
          successCount: log.SUCCESS_COUNT,
          failCount: log.FAIL_COUNT,
          fileErrorCount: log.FILE_ERROR_COUNT,
          dbErrorCount: log.DB_ERROR_COUNT,
          sesErrorCount: log.SES_ERROR_COUNT,
          message: log.MESSAGE,
        })),
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevAutomationLogs();
      }
      throw error;
    }
  }

  async getEmailLogs(params: LogQueryParams = {}) {
    if (!this.databaseService.isConnected()) {
      return this.getDevEmailLogs();
    }

    try {
      const logs = await this.logRepository.findEmailSendLogs(params);
      return {
        success: true,
        data: logs.map(log => ({
          sendId: log.SEND_ID,
          runId: log.RUN_ID,
          autoId: log.AUTO_ID,
          orgId: log.ORG_ID,
          custId: log.CUST_ID,
          email: log.EMAIL,
          subject: log.SUBJECT,
          attachFileName: log.ATTACH_FILE_NAME,
          status: log.STATUS,
          errorType: log.ERROR_TYPE,
          errorMessage: log.ERROR_MESSAGE,
          sesMessageId: log.SES_MESSAGE_ID,
          updateQueryOk: log.UPDATE_QUERY_OK,
          sendAt: log.SEND_AT,
        })),
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevEmailLogs();
      }
      throw error;
    }
  }

  async getSystemLogs(params: LogQueryParams = {}) {
    if (!this.databaseService.isConnected()) {
      return this.getDevSystemLogs();
    }

    try {
      const logs = await this.logRepository.findSystemErrorLogs(params);
      return {
        success: true,
        data: logs.map(log => ({
          errorId: log.ERROR_ID,
          autoId: log.AUTO_ID,
          orgId: log.ORG_ID,
          module: log.MODULE,
          errorMessage: log.ERROR_MESSAGE,
          stackTrace: log.STACK_TRACE,
          createdAt: log.CREATED_AT,
        })),
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevSystemLogs();
      }
      throw error;
    }
  }

  async createRunLog(autoId: number, orgId: number): Promise<number> {
    if (!this.databaseService.isConnected()) {
      return Date.now();
    }

    try {
      return await this.logRepository.createAutoRunLog({ autoId, orgId });
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return Date.now();
      }
      throw error;
    }
  }

  async updateRunLog(runId: number, dto: any): Promise<void> {
    if (!this.databaseService.isConnected()) {
      return;
    }

    try {
      await this.logRepository.updateAutoRunLog(runId, {
        status: dto.status,
        totalTarget: dto.totalTarget,
        successCount: dto.successCount,
        failCount: dto.failCount,
        fileErrorCount: dto.fileErrorCount,
        dbErrorCount: dto.dbErrorCount,
        sesErrorCount: dto.sesErrorCount,
        message: dto.message,
      });
    } catch (error) {
      if (!this.isDbConnectionError(error)) {
        throw error;
      }
    }
  }

  async saveEmailLog(log: CreateEmailSendLogDto): Promise<void> {
    if (!this.databaseService.isConnected()) {
      return;
    }

    try {
      await this.logRepository.createEmailSendLog(log);
    } catch (error) {
      if (!this.isDbConnectionError(error)) {
        throw error;
      }
    }
  }

  async saveSystemError(
    module: string,
    errorMessage: string,
    stackTrace?: string,
    autoId?: number,
    orgId?: number
  ): Promise<void> {
    if (!this.databaseService.isConnected()) {
      return;
    }

    try {
      await this.logRepository.createSystemErrorLog(module, errorMessage, stackTrace, autoId, orgId);
    } catch (error) {
      // 시스템 에러 로깅 실패는 무시
      console.error('Failed to save system error log:', error);
    }
  }

  private isDbConnectionError(error: any): boolean {
    return error.message?.includes('NJS-') ||
           error.message?.includes('ORA-') ||
           error.message?.includes('connection');
  }

  private getDevAutomationLogs() {
    return {
      success: true,
      message: 'Development mode - no database connection',
      data: [
        {
          runId: 1,
          autoId: 1,
          orgId: 1,
          startAt: new Date(Date.now() - 3600000),
          endAt: new Date(Date.now() - 3500000),
          status: 'SUCCESS',
          totalTarget: 100,
          successCount: 95,
          failCount: 5,
          fileErrorCount: 2,
          dbErrorCount: 0,
          sesErrorCount: 3,
          message: 'Completed successfully',
        },
      ],
    };
  }

  private getDevEmailLogs() {
    return {
      success: true,
      message: 'Development mode - no database connection',
      data: [
        {
          sendId: 1,
          runId: 1,
          autoId: 1,
          orgId: 1,
          custId: 'CUST001',
          email: 'sample@example.com',
          subject: 'Test Email',
          attachFileName: null,
          status: 'SUCCESS',
          errorType: null,
          errorMessage: null,
          sesMessageId: 'ses-123456',
          updateQueryOk: 'Y',
          sendAt: new Date(),
        },
      ],
    };
  }

  private getDevSystemLogs() {
    return {
      success: true,
      message: 'Development mode - no database connection',
      data: [],
    };
  }
}
