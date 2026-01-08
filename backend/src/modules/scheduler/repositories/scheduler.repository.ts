/**
 * Scheduler Repository
 * 스케줄러 데이터 접근 레이어
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.service';

export interface SchedulerEntity {
  SCHEDULER_ID: number;
  AUTO_ID: number;
  TYPE: string;
  DAY: number | null;
  HOUR: number;
  MINUTE: number;
  STATUS: string;
  CREATED_AT: Date;
  UPDATED_AT: Date;
}

export interface CreateSchedulerDto {
  autoId: number;
  type: 'REALTIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  day?: number;
  hour: number;
  minute: number;
}

export interface UpdateSchedulerDto {
  type?: string;
  day?: number;
  hour?: number;
  minute?: number;
  status?: string;
}

@Injectable()
export class SchedulerRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(status?: string): Promise<SchedulerEntity[]> {
    let sql = `
      SELECT SCHEDULER_ID, AUTO_ID, TYPE, DAY, HOUR, MINUTE, STATUS, CREATED_AT, UPDATED_AT
      FROM SCHEDULER
    `;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE STATUS = :1`;
      params.push(status);
    }

    sql += ` ORDER BY SCHEDULER_ID`;
    return this.databaseService.query<SchedulerEntity>(sql, params);
  }

  async findById(schedulerId: number): Promise<SchedulerEntity | null> {
    const sql = `
      SELECT SCHEDULER_ID, AUTO_ID, TYPE, DAY, HOUR, MINUTE, STATUS, CREATED_AT, UPDATED_AT
      FROM SCHEDULER
      WHERE SCHEDULER_ID = :1
    `;
    return this.databaseService.queryOne<SchedulerEntity>(sql, [schedulerId]);
  }

  async findByAutoId(autoId: number): Promise<SchedulerEntity | null> {
    const sql = `
      SELECT SCHEDULER_ID, AUTO_ID, TYPE, DAY, HOUR, MINUTE, STATUS, CREATED_AT, UPDATED_AT
      FROM SCHEDULER
      WHERE AUTO_ID = :1
    `;
    return this.databaseService.queryOne<SchedulerEntity>(sql, [autoId]);
  }

  async findActiveSchedulers(): Promise<SchedulerEntity[]> {
    const sql = `
      SELECT s.SCHEDULER_ID, s.AUTO_ID, s.TYPE, s.DAY, s.HOUR, s.MINUTE, s.STATUS,
             s.CREATED_AT, s.UPDATED_AT
      FROM SCHEDULER s
      INNER JOIN AUTOMATION a ON s.AUTO_ID = a.AUTO_ID
      WHERE s.STATUS = 'ACTIVE' AND a.STATUS = 'ACTIVE'
      ORDER BY s.HOUR, s.MINUTE
    `;
    return this.databaseService.query<SchedulerEntity>(sql);
  }

  async create(dto: CreateSchedulerDto): Promise<number> {
    const sql = `
      INSERT INTO SCHEDULER (AUTO_ID, TYPE, DAY, HOUR, MINUTE, STATUS, CREATED_AT, UPDATED_AT)
      VALUES (:1, :2, :3, :4, :5, 'ACTIVE', SYSDATE, SYSDATE)
    `;
    return this.databaseService.insert(
      sql,
      [dto.autoId, dto.type, dto.day || null, dto.hour, dto.minute],
      'SCHEDULER_ID'
    );
  }

  async update(schedulerId: number, dto: UpdateSchedulerDto): Promise<number> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (dto.type !== undefined) {
      updates.push(`TYPE = :${paramIndex++}`);
      params.push(dto.type);
    }
    if (dto.day !== undefined) {
      updates.push(`DAY = :${paramIndex++}`);
      params.push(dto.day);
    }
    if (dto.hour !== undefined) {
      updates.push(`HOUR = :${paramIndex++}`);
      params.push(dto.hour);
    }
    if (dto.minute !== undefined) {
      updates.push(`MINUTE = :${paramIndex++}`);
      params.push(dto.minute);
    }
    if (dto.status !== undefined) {
      updates.push(`STATUS = :${paramIndex++}`);
      params.push(dto.status);
    }

    if (updates.length === 0) {
      return 0;
    }

    updates.push(`UPDATED_AT = SYSDATE`);
    params.push(schedulerId);

    const sql = `
      UPDATE SCHEDULER
      SET ${updates.join(', ')}
      WHERE SCHEDULER_ID = :${paramIndex}
    `;

    return this.databaseService.execute(sql, params);
  }

  async delete(schedulerId: number): Promise<number> {
    const sql = `DELETE FROM SCHEDULER WHERE SCHEDULER_ID = :1`;
    return this.databaseService.execute(sql, [schedulerId]);
  }

  async deleteByAutoId(autoId: number): Promise<number> {
    const sql = `DELETE FROM SCHEDULER WHERE AUTO_ID = :1`;
    return this.databaseService.execute(sql, [autoId]);
  }

  async updateStatus(schedulerId: number, status: string): Promise<number> {
    const sql = `
      UPDATE SCHEDULER
      SET STATUS = :1, UPDATED_AT = SYSDATE
      WHERE SCHEDULER_ID = :2
    `;
    return this.databaseService.execute(sql, [status, schedulerId]);
  }
}
