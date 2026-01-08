/**
 * Automation Repository
 * Automation 및 관련 테이블 데이터 접근 레이어
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.service';

// Entity Interfaces
export interface AutomationEntity {
  AUTO_ID: number;
  ORG_ID: number;
  AUTO_NAME: string;
  STATUS: string;
  LAST_RUN_AT: Date | null;
  NEXT_RUN_AT: Date | null;
  CREATED_AT: Date;
  UPDATED_AT: Date;
}

export interface DbioTargetEntity {
  TARGET_ID: number;
  AUTO_ID: number;
  QUERY_TEXT: string;
  APPEND_MODE: string;
  CREATED_AT: Date;
  UPDATED_AT: Date;
}

export interface DbioMappingEntity {
  MAP_ID: number;
  AUTO_ID: number;
  QUERY_TEXT: string;
  MAP_TYPE: string;
  CREATED_AT: Date;
  UPDATED_AT: Date;
}

export interface DbioUpdateEntity {
  UPDATE_ID: number;
  AUTO_ID: number;
  QUERY_TEXT: string;
  CREATED_AT: Date;
  UPDATED_AT: Date;
}

export interface TemplateEntity {
  TEMPLATE_ID: number;
  AUTO_ID: number;
  HTML_CONTENT: string;
  VALID_YN: string;
  UPDATED_BY: number;
  UPDATED_AT: Date;
}

export interface EmailSettingEntity {
  SETTING_ID: number;
  AUTO_ID: number;
  SENDER_EMAIL: string;
  SENDER_NAME: string;
  RETURN_EMAIL: string;
  SUBJECT_TEMPLATE: string;
  LANGUAGE: string;
  UPDATED_AT: Date;
}

// DTO Interfaces
export interface CreateAutomationDto {
  orgId: number;
  autoName: string;
  status?: string;
}

export interface UpdateAutomationDto {
  autoName?: string;
  status?: string;
}

@Injectable()
export class AutomationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // ==================== AUTOMATION ====================

  async findAll(orgId?: number): Promise<AutomationEntity[]> {
    let sql = `
      SELECT AUTO_ID, ORG_ID, AUTO_NAME, STATUS, LAST_RUN_AT, NEXT_RUN_AT, CREATED_AT, UPDATED_AT
      FROM AUTOMATION
    `;
    const params: any[] = [];

    if (orgId) {
      sql += ` WHERE ORG_ID = :1`;
      params.push(orgId);
    }

    sql += ` ORDER BY AUTO_ID DESC`;
    return this.databaseService.query<AutomationEntity>(sql, params);
  }

  async findById(autoId: number): Promise<AutomationEntity | null> {
    const sql = `
      SELECT AUTO_ID, ORG_ID, AUTO_NAME, STATUS, LAST_RUN_AT, NEXT_RUN_AT, CREATED_AT, UPDATED_AT
      FROM AUTOMATION
      WHERE AUTO_ID = :1
    `;
    return this.databaseService.queryOne<AutomationEntity>(sql, [autoId]);
  }

  async create(dto: CreateAutomationDto): Promise<number> {
    const sql = `
      INSERT INTO AUTOMATION (ORG_ID, AUTO_NAME, STATUS, CREATED_AT, UPDATED_AT)
      VALUES (:1, :2, :3, SYSDATE, SYSDATE)
    `;
    return this.databaseService.insert(
      sql,
      [dto.orgId, dto.autoName, dto.status || 'INACTIVE'],
      'AUTO_ID'
    );
  }

  async update(autoId: number, dto: UpdateAutomationDto): Promise<number> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (dto.autoName !== undefined) {
      updates.push(`AUTO_NAME = :${paramIndex++}`);
      params.push(dto.autoName);
    }
    if (dto.status !== undefined) {
      updates.push(`STATUS = :${paramIndex++}`);
      params.push(dto.status);
    }

    if (updates.length === 0) {
      return 0;
    }

    updates.push(`UPDATED_AT = SYSDATE`);
    params.push(autoId);

    const sql = `
      UPDATE AUTOMATION
      SET ${updates.join(', ')}
      WHERE AUTO_ID = :${paramIndex}
    `;

    return this.databaseService.execute(sql, params);
  }

  async updateLastRun(autoId: number, nextRunAt?: Date): Promise<number> {
    const sql = `
      UPDATE AUTOMATION
      SET LAST_RUN_AT = SYSDATE, NEXT_RUN_AT = :1, UPDATED_AT = SYSDATE
      WHERE AUTO_ID = :2
    `;
    return this.databaseService.execute(sql, [nextRunAt || null, autoId]);
  }

  async delete(autoId: number): Promise<number> {
    const sql = `DELETE FROM AUTOMATION WHERE AUTO_ID = :1`;
    return this.databaseService.execute(sql, [autoId]);
  }

  // ==================== DBIO TARGET ====================

  async findTargetByAutoId(autoId: number): Promise<DbioTargetEntity | null> {
    const sql = `
      SELECT TARGET_ID, AUTO_ID, QUERY_TEXT, APPEND_MODE, CREATED_AT, UPDATED_AT
      FROM DBIO_TARGET
      WHERE AUTO_ID = :1
    `;
    return this.databaseService.queryOne<DbioTargetEntity>(sql, [autoId]);
  }

  async upsertTarget(autoId: number, queryText: string, appendMode: string = 'N'): Promise<number> {
    const existing = await this.findTargetByAutoId(autoId);

    if (existing) {
      const sql = `
        UPDATE DBIO_TARGET
        SET QUERY_TEXT = :1, APPEND_MODE = :2, UPDATED_AT = SYSDATE
        WHERE AUTO_ID = :3
      `;
      return this.databaseService.execute(sql, [queryText, appendMode, autoId]);
    } else {
      const sql = `
        INSERT INTO DBIO_TARGET (AUTO_ID, QUERY_TEXT, APPEND_MODE, CREATED_AT, UPDATED_AT)
        VALUES (:1, :2, :3, SYSDATE, SYSDATE)
      `;
      return this.databaseService.insert(sql, [autoId, queryText, appendMode], 'TARGET_ID');
    }
  }

  // ==================== DBIO MAPPING ====================

  async findMappingsByAutoId(autoId: number): Promise<DbioMappingEntity[]> {
    const sql = `
      SELECT MAP_ID, AUTO_ID, QUERY_TEXT, MAP_TYPE, CREATED_AT, UPDATED_AT
      FROM DBIO_MAPPING
      WHERE AUTO_ID = :1
      ORDER BY MAP_ID
    `;
    return this.databaseService.query<DbioMappingEntity>(sql, [autoId]);
  }

  async upsertMapping(autoId: number, queryText: string, mapType: string = 'SIMPLE'): Promise<number> {
    // 기존 매핑 삭제 후 새로 생성 (단순화)
    await this.databaseService.execute(`DELETE FROM DBIO_MAPPING WHERE AUTO_ID = :1`, [autoId]);

    const sql = `
      INSERT INTO DBIO_MAPPING (AUTO_ID, QUERY_TEXT, MAP_TYPE, CREATED_AT, UPDATED_AT)
      VALUES (:1, :2, :3, SYSDATE, SYSDATE)
    `;
    return this.databaseService.insert(sql, [autoId, queryText, mapType], 'MAP_ID');
  }

  // ==================== DBIO UPDATE ====================

  async findUpdateByAutoId(autoId: number): Promise<DbioUpdateEntity | null> {
    const sql = `
      SELECT UPDATE_ID, AUTO_ID, QUERY_TEXT, CREATED_AT, UPDATED_AT
      FROM DBIO_UPDATE
      WHERE AUTO_ID = :1
    `;
    return this.databaseService.queryOne<DbioUpdateEntity>(sql, [autoId]);
  }

  async upsertUpdate(autoId: number, queryText: string): Promise<number> {
    const existing = await this.findUpdateByAutoId(autoId);

    if (existing) {
      const sql = `
        UPDATE DBIO_UPDATE
        SET QUERY_TEXT = :1, UPDATED_AT = SYSDATE
        WHERE AUTO_ID = :2
      `;
      return this.databaseService.execute(sql, [queryText, autoId]);
    } else {
      const sql = `
        INSERT INTO DBIO_UPDATE (AUTO_ID, QUERY_TEXT, CREATED_AT, UPDATED_AT)
        VALUES (:1, :2, SYSDATE, SYSDATE)
      `;
      return this.databaseService.insert(sql, [autoId, queryText], 'UPDATE_ID');
    }
  }

  // ==================== TEMPLATE ====================

  async findTemplateByAutoId(autoId: number): Promise<TemplateEntity | null> {
    const sql = `
      SELECT TEMPLATE_ID, AUTO_ID, HTML_CONTENT, VALID_YN, UPDATED_BY, UPDATED_AT
      FROM TEMPLATE
      WHERE AUTO_ID = :1
    `;
    return this.databaseService.queryOne<TemplateEntity>(sql, [autoId]);
  }

  async upsertTemplate(autoId: number, htmlContent: string, updatedBy: number): Promise<number> {
    const existing = await this.findTemplateByAutoId(autoId);

    if (existing) {
      const sql = `
        UPDATE TEMPLATE
        SET HTML_CONTENT = :1, VALID_YN = 'Y', UPDATED_BY = :2, UPDATED_AT = SYSDATE
        WHERE AUTO_ID = :3
      `;
      return this.databaseService.execute(sql, [htmlContent, updatedBy, autoId]);
    } else {
      const sql = `
        INSERT INTO TEMPLATE (AUTO_ID, HTML_CONTENT, VALID_YN, UPDATED_BY, UPDATED_AT)
        VALUES (:1, :2, 'Y', :3, SYSDATE)
      `;
      return this.databaseService.insert(sql, [autoId, htmlContent, updatedBy], 'TEMPLATE_ID');
    }
  }

  // ==================== EMAIL SETTING ====================

  async findEmailSettingByAutoId(autoId: number): Promise<EmailSettingEntity | null> {
    const sql = `
      SELECT SETTING_ID, AUTO_ID, SENDER_EMAIL, SENDER_NAME, RETURN_EMAIL,
             SUBJECT_TEMPLATE, LANGUAGE, UPDATED_AT
      FROM EMAIL_SETTING
      WHERE AUTO_ID = :1
    `;
    return this.databaseService.queryOne<EmailSettingEntity>(sql, [autoId]);
  }

  async upsertEmailSetting(
    autoId: number,
    senderEmail: string,
    senderName: string,
    returnEmail: string,
    subjectTemplate: string,
    language: string = 'UTF-8'
  ): Promise<number> {
    const existing = await this.findEmailSettingByAutoId(autoId);

    if (existing) {
      const sql = `
        UPDATE EMAIL_SETTING
        SET SENDER_EMAIL = :1, SENDER_NAME = :2, RETURN_EMAIL = :3,
            SUBJECT_TEMPLATE = :4, LANGUAGE = :5, UPDATED_AT = SYSDATE
        WHERE AUTO_ID = :6
      `;
      return this.databaseService.execute(sql, [
        senderEmail, senderName, returnEmail, subjectTemplate, language, autoId
      ]);
    } else {
      const sql = `
        INSERT INTO EMAIL_SETTING (AUTO_ID, SENDER_EMAIL, SENDER_NAME, RETURN_EMAIL,
                                   SUBJECT_TEMPLATE, LANGUAGE, UPDATED_AT)
        VALUES (:1, :2, :3, :4, :5, :6, SYSDATE)
      `;
      return this.databaseService.insert(sql, [
        autoId, senderEmail, senderName, returnEmail, subjectTemplate, language
      ], 'SETTING_ID');
    }
  }
}
